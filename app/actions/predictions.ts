'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'
const SEASON = 2026

type SessionType = 'race' | 'qualifying' | 'sprint' | 'sprint_qualifying'
type PredictionType =
  | 'race_winner' | 'race_constructor' | 'fastest_lap' | 'pole_position'
  | 'podium_yn' | 'finisher_count' | 'qualifying_duel' | 'custom'

// 2026 팀별 드라이버 페어링 (자동정산 qualifying_duel 매칭용)
const TEAM_PAIRINGS_2026 = [
  { team: 'McLaren',       a: 'NOR - Lando Norris',        b: 'PIA - Oscar Piastri' },
  { team: 'Ferrari',       a: 'LEC - Charles Leclerc',     b: 'HAM - Lewis Hamilton' },
  { team: 'Mercedes',      a: 'RUS - George Russell',      b: 'ANT - Kimi Antonelli' },
  { team: 'Red Bull',      a: 'VER - Max Verstappen',      b: 'LAW - Liam Lawson' },
  { team: 'Aston Martin',  a: 'ALO - Fernando Alonso',     b: 'STR - Lance Stroll' },
  { team: 'Alpine',        a: 'GAS - Pierre Gasly',        b: 'DOO - Jack Doohan' },
  { team: 'Haas',          a: 'BEA - Oliver Bearman',      b: 'HUL - Nico Hulkenberg' },
  { team: 'Racing Bulls',  a: 'TSU - Yuki Tsunoda',        b: 'HAD - Isack Hadjar' },
  { team: 'Kick Sauber',   a: 'BOT - Valtteri Bottas',     b: 'BOR - Gabriel Bortoleto' },
  { team: 'Williams',      a: 'ALB - Alexander Albon',     b: 'SAI - Carlos Sainz' },
]

// 포디움 여부 대상 드라이버 (인기 상위)
const PODIUM_YN_DRIVERS = [
  { code: 'NOR', name: '란도 노리스 (Lando Norris)', optCode: 'NOR - Lando Norris' },
  { code: 'VER', name: '막스 베르스타펜 (Max Verstappen)', optCode: 'VER - Max Verstappen' },
  { code: 'LEC', name: '샤를 르끌레르 (Charles Leclerc)', optCode: 'LEC - Charles Leclerc' },
  { code: 'HAM', name: '루이스 해밀턴 (Lewis Hamilton)', optCode: 'HAM - Lewis Hamilton' },
]

// 경기별 표준 예측 항목 자동 생성 (이미 예측이 있으면 skip)
export async function generateRacePredictions(raceId: string, round: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const { count } = await adminSupabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('race_id', raceId)

  if ((count ?? 0) > 0) {
    return { success: false, error: 'ALREADY_EXISTS' }
  }

  const [driversRes, constructorsRes] = await Promise.all([
    fetch(`${JOLPICA_BASE}/${SEASON}/drivers.json`, { next: { revalidate: 86400 } }),
    fetch(`${JOLPICA_BASE}/${SEASON}/constructors.json`, { next: { revalidate: 86400 } }),
  ])

  const driversJson = driversRes.ok ? await driversRes.json() : null
  const constructorsJson = constructorsRes.ok ? await constructorsRes.json() : null

  const driverOptions: string[] = driversJson?.MRData?.DriverTable?.Drivers
    ? driversJson.MRData.DriverTable.Drivers.map(
        (d: { code: string; givenName: string; familyName: string }) =>
          `${d.code} - ${d.givenName} ${d.familyName}`
      )
    : TEAM_PAIRINGS_2026.flatMap((p) => [p.a, p.b])

  const constructorOptions: string[] = constructorsJson?.MRData?.ConstructorTable?.Constructors
    ? constructorsJson.MRData.ConstructorTable.Constructors.map(
        (c: { name: string }) => c.name
      )
    : ['Red Bull Racing', 'Ferrari', 'McLaren', 'Mercedes', 'Aston Martin',
       'Alpine', 'Haas', 'Racing Bulls', 'Kick Sauber', 'Williams']

  // driverOptions에서 해당 코드의 실제 옵션 문자열 찾기 (API가 다를 경우 대비)
  const findDriverOpt = (fallback: string) => {
    const code = fallback.split(' - ')[0]
    return driverOptions.find((o) => o.startsWith(code + ' - ')) ?? fallback
  }

  // 상위권 팀 10명 (Q1 충격 탈락 선택지)
  const topDrivers = TEAM_PAIRINGS_2026
    .slice(0, 5) // 상위 5팀
    .flatMap((p) => [findDriverOpt(p.a), findDriverOpt(p.b)])

  type PredRow = {
    race_id: string
    question: string
    options: string[]
    prediction_type: PredictionType
    session_type: SessionType
  }

  const predictions: PredRow[] = [
    // ═══════════════════════════════════════════════════════
    // 예선 세션
    // ═══════════════════════════════════════════════════════

    // 폴 포지션
    {
      race_id: raceId,
      question: '예선 폴 포지션(Pole Position)은?',
      options: driverOptions,
      prediction_type: 'pole_position',
      session_type: 'qualifying',
    },

    // Q1 충격 탈락
    {
      race_id: raceId,
      question: 'Q1에서 충격적으로 탈락할 상위권 팀 드라이버는?',
      options: topDrivers,
      prediction_type: 'custom',
      session_type: 'qualifying',
    },

    // 팀메이트 내전 × 10팀
    ...TEAM_PAIRINGS_2026.map((pair): PredRow => ({
      race_id: raceId,
      question: `팀메이트 내전 — ${pair.team}: 예선 기록 기준 더 빠른 드라이버는?`,
      options: [findDriverOpt(pair.a), findDriverOpt(pair.b)],
      prediction_type: 'qualifying_duel',
      session_type: 'qualifying',
    })),

    // ═══════════════════════════════════════════════════════
    // 결승 레이스 세션
    // ═══════════════════════════════════════════════════════

    // 우승 드라이버
    {
      race_id: raceId,
      question: '이번 그랑프리 우승 드라이버는?',
      options: driverOptions,
      prediction_type: 'race_winner',
      session_type: 'race',
    },

    // 우승 컨스트럭터
    {
      race_id: raceId,
      question: '우승 컨스트럭터(팀)는?',
      options: constructorOptions,
      prediction_type: 'race_constructor',
      session_type: 'race',
    },

    // 패스티스트 랩
    {
      race_id: raceId,
      question: '패스티스트 랩(Fastest Lap) 기록자는?',
      options: driverOptions,
      prediction_type: 'fastest_lap',
      session_type: 'race',
    },

    // 포디움 입성 여부 (인기 드라이버 4명)
    ...PODIUM_YN_DRIVERS.map((d): PredRow => ({
      race_id: raceId,
      question: `${d.name}가 이번 경기 포디움(1~3위)에 오를까?`,
      options: ['Yes', 'No'],
      prediction_type: 'podium_yn',
      session_type: 'race',
    })),

    // 드라이버 오브 더 데이
    {
      race_id: raceId,
      question: '드라이버 오브 더 데이(DOTD)는?',
      options: driverOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 페라리 더블 포디움
    {
      race_id: raceId,
      question: '페라리 듀오(르끌레르 & 해밀턴)가 모두 포디움에 오를까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 랩 1 선두 통과
    {
      race_id: raceId,
      question: '첫 번째 랩(Lap 1)을 선두로 통과할 드라이버는?',
      options: driverOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 언더독의 반란
    {
      race_id: raceId,
      question: '하위권 팀(Haas, Racing Bulls, Kick Sauber, Williams) 드라이버가 포인트권(10위 이내)에 진입할까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 세이프티 카
    {
      race_id: raceId,
      question: '세이프티 카(Safety Car)가 1회 이상 출동할까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 레드 플래그
    {
      race_id: raceId,
      question: '레드 플래그(Red Flag)가 발생할까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 첫 리타이어(DNF)
    {
      race_id: raceId,
      question: '가장 먼저 리타이어(DNF)할 드라이버는?',
      options: driverOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 총 완주 차량 수
    {
      race_id: raceId,
      question: '총 완주 차량 수는?',
      options: ['16대 이상', '15대 이하'],
      prediction_type: 'finisher_count',
      session_type: 'race',
    },

    // 핏스탑 최속 팀
    {
      race_id: raceId,
      question: '가장 빠른 핏스탑(DHL Fastest Pit Stop)을 기록할 팀은?',
      options: constructorOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 그리드 페널티 2명+
    {
      race_id: raceId,
      question: '그리드 페널티(엔진 교체 등)를 받는 드라이버가 2명 이상 나올까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },

    // 1위-2위 격차
    {
      race_id: raceId,
      question: '우승자와 2위의 결승선 격차는?',
      options: ['5초 미만 (쫄깃한 승부)', '5초 이상 (압도적 우승)'],
      prediction_type: 'custom',
      session_type: 'race',
    },
  ]

  const { error } = await adminSupabase.from('predictions').insert(predictions)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/predict/${raceId}`)
  return { success: true, count: predictions.length }
}

export async function createPrediction(
  raceId: string,
  question: string,
  options: string[],
  predictionType: PredictionType,
  sessionType: SessionType = 'race'
) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  if (!question.trim()) return { success: false, error: '질문을 입력해주세요.' }
  const validOptions = options.map((o) => o.trim()).filter(Boolean)
  if (validOptions.length < 2) return { success: false, error: '선택지를 최소 2개 입력해주세요.' }

  const { error } = await adminSupabase.from('predictions').insert({
    race_id: raceId,
    question: question.trim(),
    options: validOptions,
    prediction_type: predictionType,
    session_type: sessionType,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/predict/${raceId}`)
  return { success: true }
}
