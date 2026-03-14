'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SettleResult =
  | {
      success: true
      total_pool: number
      net_pool: number
      winner_count: number
      distributed: number
      message?: string
    }
  | { success: false; error: string }

export async function settlePrediction(
  predictionId: string,
  winningOption: string
): Promise<SettleResult> {
  // 서버 액션 레벨 이중 검증 (미들웨어 우회 방지)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const { data, error } = await supabase.rpc('settle_prediction', {
    p_prediction_id: predictionId,
    p_winning_option: winningOption,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath('/')

  return data as SettleResult
}

// prediction_type = 'race_winner'인 예측을 race_results에서 자동 매핑하여 정산
export async function autoSettlePrediction(predictionId: string): Promise<
  | { success: true; matched_option: string; settle_result: SettleResult }
  | { success: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  // 예측 항목 조회
  const { data: prediction } = await supabase
    .from('predictions')
    .select('id, race_id, question, options, prediction_type, is_settled')
    .eq('id', predictionId)
    .single()

  if (!prediction) return { success: false, error: 'PREDICTION_NOT_FOUND' }
  if (prediction.is_settled) return { success: false, error: 'ALREADY_SETTLED' }

  const options = prediction.options as string[]
  const type = prediction.prediction_type

  const AUTO_TYPES = ['race_winner', 'race_constructor', 'fastest_lap', 'pole_position', 'finisher_count', 'podium_yn', 'qualifying_duel']
  if (!AUTO_TYPES.includes(type)) {
    return { success: false, error: 'NOT_AUTO_SETTLEABLE' }
  }

  // 드라이버/팀명 옵션 매칭 헬퍼 (코드, 전체이름, 성, "코드 - 이름" 형식 지원)
  function matchDriver(opts: string[], code: string, name: string): string | undefined {
    const codeLower = code.toLowerCase()
    const nameLower = name.toLowerCase()
    const familyName = nameLower.split(' ').slice(-1)[0]
    return opts.find((opt) => {
      const o = opt.trim().toLowerCase()
      return (
        o === codeLower ||
        o === nameLower ||
        nameLower.includes(o) ||
        o.includes(familyName) ||
        o.startsWith(codeLower + ' - ') ||
        o.includes(nameLower.split(' ')[1] ?? '__NOMATCH__')
      )
    })
  }

  let matched: string | undefined

  // ── race_winner ───────────────────────────────────────────────
  if (type === 'race_winner') {
    const { data: winner } = await supabase
      .from('race_results')
      .select('driver_code, driver_name')
      .eq('race_id', prediction.race_id)
      .eq('position', 1)
      .single()
    if (!winner) return { success: false, error: 'NO_RESULTS_SYNCED' }
    matched = matchDriver(options, winner.driver_code, winner.driver_name)
    if (!matched) return { success: false, error: `NO_MATCH (winner: ${winner.driver_code} / ${winner.driver_name})` }
  }

  // ── race_constructor ──────────────────────────────────────────
  else if (type === 'race_constructor') {
    const { data: winner } = await supabase
      .from('race_results')
      .select('constructor_name')
      .eq('race_id', prediction.race_id)
      .eq('position', 1)
      .single()
    if (!winner) return { success: false, error: 'NO_RESULTS_SYNCED' }
    const cLower = winner.constructor_name.toLowerCase()
    matched = options.find((opt) => {
      const o = opt.trim().toLowerCase()
      return o === cLower || cLower.includes(o) || o.includes(cLower.split(' ')[0])
    })
    if (!matched) return { success: false, error: `NO_MATCH (constructor: ${winner.constructor_name})` }
  }

  // ── fastest_lap ───────────────────────────────────────────────
  else if (type === 'fastest_lap') {
    const { data: fastestDriver } = await supabase
      .from('race_results')
      .select('driver_code, driver_name')
      .eq('race_id', prediction.race_id)
      .eq('is_fastest_lap', true)
      .single()
    if (!fastestDriver) return { success: false, error: 'NO_RESULTS_SYNCED' }
    matched = matchDriver(options, fastestDriver.driver_code, fastestDriver.driver_name)
    if (!matched) return { success: false, error: `NO_MATCH (fastest: ${fastestDriver.driver_code})` }
  }

  // ── pole_position ─────────────────────────────────────────────
  else if (type === 'pole_position') {
    const { data: pole } = await supabase
      .from('qualifying_results')
      .select('driver_code, driver_name')
      .eq('race_id', prediction.race_id)
      .eq('position', 1)
      .single()
    if (!pole) return { success: false, error: 'NO_QUALIFYING_SYNCED' }
    matched = matchDriver(options, pole.driver_code, pole.driver_name)
    if (!matched) return { success: false, error: `NO_MATCH (pole: ${pole.driver_code})` }
  }

  // ── finisher_count ────────────────────────────────────────────
  else if (type === 'finisher_count') {
    const { count } = await supabase
      .from('race_results')
      .select('id', { count: 'exact', head: true })
      .eq('race_id', prediction.race_id)
      .eq('status', 'Finished')
    if (count === null) return { success: false, error: 'NO_RESULTS_SYNCED' }
    matched = count >= 16 ? options.find((o) => o.includes('16')) : options.find((o) => o.includes('15'))
    if (!matched) return { success: false, error: `NO_MATCH (finishers: ${count})` }
  }

  // ── podium_yn ─────────────────────────────────────────────────
  else if (type === 'podium_yn') {
    // question에서 드라이버 이름 추출 후 race_results position 1-3 여부 확인
    const { data: podiumDrivers } = await supabase
      .from('race_results')
      .select('driver_code, driver_name')
      .eq('race_id', prediction.race_id)
      .lte('position', 3)
    if (!podiumDrivers || podiumDrivers.length === 0) return { success: false, error: 'NO_RESULTS_SYNCED' }
    const qLower = prediction.question ? prediction.question.toLowerCase() : ''
    const inPodium = podiumDrivers.some((d) => {
      const codeLower = d.driver_code.toLowerCase()
      const nameLower = d.driver_name.toLowerCase()
      return qLower.includes(codeLower) || qLower.includes(nameLower) || qLower.includes(nameLower.split(' ').slice(-1)[0])
    })
    matched = inPodium ? options.find((o) => o === 'Yes') : options.find((o) => o === 'No')
    if (!matched) return { success: false, error: 'NO_MATCH (podium_yn)' }
  }

  // ── qualifying_duel ───────────────────────────────────────
  else if (type === 'qualifying_duel') {
    if (options.length !== 2) return { success: false, error: 'INVALID_OPTIONS' }
    const { data: qualResults } = await supabase
      .from('qualifying_results')
      .select('driver_code, driver_name, position')
      .eq('race_id', prediction.race_id)
      .order('position', { ascending: true })
    if (!qualResults || qualResults.length === 0) return { success: false, error: 'NO_QUALIFYING_SYNCED' }
    const findPos = (opt: string) => {
      const r = qualResults.find((d) => matchDriver([opt], d.driver_code, d.driver_name))
      return r ? r.position : 999
    }
    const posA = findPos(options[0])
    const posB = findPos(options[1])
    if (posA === 999 && posB === 999) return { success: false, error: `NO_MATCH (qualifying_duel)` }
    matched = posA <= posB ? options[0] : options[1]
  }

  if (!matched) return { success: false, error: 'NO_MATCH' }

  const settleResult = await settlePrediction(predictionId, matched)
  return { success: true, matched_option: matched, settle_result: settleResult }
}
