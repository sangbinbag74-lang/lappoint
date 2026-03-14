'use server'

import { createClient } from '@/lib/supabase/server'

type BetResult =
  | { success: true; fee: number; new_balance: number }
  | { success: false; error: string }

export async function placeBet(
  predictionId: string,
  selectedOption: string,
  betAmount: number
): Promise<BetResult> {
  if (!Number.isInteger(betAmount) || betAmount < 10) {
    return { success: false, error: 'MIN_BET' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  // 세션 시작 시간 체크 → 배팅 마감 여부 확인
  const { data: pred } = await supabase
    .from('predictions')
    .select('session_type, race_id, is_settled')
    .eq('id', predictionId)
    .single()

  if (pred?.is_settled) return { success: false, error: 'ALREADY_SETTLED' }

  if (pred) {
    const { data: race } = await supabase
      .from('races')
      .select('race_date, qualifying_date, sprint_date, sprint_qualifying_date')
      .eq('id', pred.race_id)
      .single()

    if (race) {
      const now = new Date()
      const sessionDate =
        pred.session_type === 'qualifying'
          ? race.qualifying_date
          : pred.session_type === 'sprint'
          ? race.sprint_date
          : pred.session_type === 'sprint_qualifying'
          ? race.sprint_qualifying_date
          : race.race_date

      if (sessionDate && new Date(sessionDate) <= now) {
        return { success: false, error: 'BETTING_LOCKED' }
      }
    }
  }

  const { data, error } = await supabase.rpc('place_bet', {
    p_user_id: user.id,
    p_prediction_id: predictionId,
    p_selected_option: selectedOption,
    p_bet_amount: betAmount,
  })

  if (error) return { success: false, error: error.message }
  return data as BetResult
}
