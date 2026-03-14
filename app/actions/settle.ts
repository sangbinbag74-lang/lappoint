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
    .select('id, race_id, options, prediction_type, is_settled')
    .eq('id', predictionId)
    .single()

  if (!prediction) return { success: false, error: 'PREDICTION_NOT_FOUND' }
  if (prediction.is_settled) return { success: false, error: 'ALREADY_SETTLED' }
  if (prediction.prediction_type !== 'race_winner') {
    return { success: false, error: 'NOT_AUTO_SETTLEABLE' }
  }

  // 해당 경기의 1위 결과 조회
  const { data: winner } = await supabase
    .from('race_results')
    .select('driver_code, driver_name')
    .eq('race_id', prediction.race_id)
    .eq('position', 1)
    .single()

  if (!winner) return { success: false, error: 'NO_RESULTS_SYNCED' }

  const options = prediction.options as string[]
  const codeUpper = winner.driver_code.toUpperCase()
  const nameLower = winner.driver_name.toLowerCase()

  // options 중 driver_code 또는 driver_name(성)과 일치하는 항목 탐색
  const matched = options.find((opt) => {
    const o = opt.trim().toLowerCase()
    return (
      o === codeUpper.toLowerCase() ||
      o === nameLower ||
      nameLower.includes(o) ||
      o.includes(nameLower.split(' ')[1] ?? '') // 성(family name) 포함 여부
    )
  })

  if (!matched) {
    return { success: false, error: `NO_MATCH (winner: ${winner.driver_code} / ${winner.driver_name})` }
  }

  const settleResult = await settlePrediction(predictionId, matched)
  return { success: true, matched_option: matched, settle_result: settleResult }
}
