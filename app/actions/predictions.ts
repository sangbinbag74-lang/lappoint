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

// 경기별 표준 예측 항목 10개 자동 생성 (이미 예측이 있으면 skip)
export async function generateRacePredictions(raceId: string, round: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  // 이미 예측이 있으면 skip
  const { count } = await adminSupabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('race_id', raceId)

  if ((count ?? 0) > 0) {
    return { success: false, error: 'ALREADY_EXISTS' }
  }

  // 드라이버 목록 fetch
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
    : ['VER - Max Verstappen', 'NOR - Lando Norris', 'LEC - Charles Leclerc',
       'PIA - Oscar Piastri', 'RUS - George Russell', 'ANT - Kimi Antonelli',
       'HAM - Lewis Hamilton', 'SAI - Carlos Sainz', 'ALO - Fernando Alonso',
       'STR - Lance Stroll', 'GAS - Pierre Gasly', 'OCO - Esteban Ocon',
       'HUL - Nico Hulkenberg', 'BOT - Valtteri Bottas', 'ZHO - Guanyu Zhou',
       'TSU - Yuki Tsunoda', 'LAW - Liam Lawson', 'HAD - Isack Hadjar',
       'BEA - Oliver Bearman', 'DOO - Jack Doohan', 'BOR - Gabriel Bortoleto', 'ALB - Alexander Albon']

  const constructorOptions: string[] = constructorsJson?.MRData?.ConstructorTable?.Constructors
    ? constructorsJson.MRData.ConstructorTable.Constructors.map(
        (c: { name: string }) => c.name
      )
    : ['Red Bull Racing', 'Ferrari', 'McLaren', 'Mercedes', 'Aston Martin',
       'Alpine', 'Haas', 'Racing Bulls', 'Kick Sauber', 'Williams']

  const predictions: Array<{
    race_id: string
    question: string
    options: string[]
    prediction_type: PredictionType
    session_type: SessionType
  }> = [
    // ── 예선 세션 ─────────────────────────────────────────────────
    {
      race_id: raceId,
      question: '예선 폴 포지션(Pole Position)은?',
      options: driverOptions,
      prediction_type: 'pole_position',
      session_type: 'qualifying',
    },
    // ── 결승 레이스 세션 ──────────────────────────────────────────
    {
      race_id: raceId,
      question: '이번 그랑프리 우승 드라이버는?',
      options: driverOptions,
      prediction_type: 'race_winner',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '우승 컨스트럭터(팀)는?',
      options: constructorOptions,
      prediction_type: 'race_constructor',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '패스티스트 랩(Fastest Lap) 기록자는?',
      options: driverOptions,
      prediction_type: 'fastest_lap',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '세이프티 카(Safety Car)가 1회 이상 출동할까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '레드 플래그(Red Flag)가 발생할까?',
      options: ['Yes', 'No'],
      prediction_type: 'custom',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '가장 먼저 리타이어(DNF)할 드라이버는?',
      options: driverOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '총 완주 차량 수는?',
      options: ['16대 이상', '15대 이하'],
      prediction_type: 'finisher_count',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '드라이버 오브 더 데이(DOTD)는?',
      options: driverOptions,
      prediction_type: 'custom',
      session_type: 'race',
    },
    {
      race_id: raceId,
      question: '우승자와 2위의 격차는?',
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
