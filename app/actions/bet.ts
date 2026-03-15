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
    .select('session_type, race_id, is_settled, manually_locked')
    .eq('id', predictionId)
    .single()

  if (pred?.is_settled) return { success: false, error: 'ALREADY_SETTLED' }
  if (pred?.manually_locked) return { success: false, error: 'BETTING_LOCKED' }

  if (pred) {
    const { data: race } = await supabase
      .from('races')
      .select('race_date, qualifying_date, sprint_date, sprint_qualifying_date, betting_locked')
      .eq('id', pred.race_id)
      .single()

    if (race) {
      if (race.betting_locked) return { success: false, error: 'BETTING_LOCKED' }

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

type IncreaseBetResult =
  | { success: true; new_balance: number; new_amount: number }
  | { success: false; error: string }

export async function increaseBet(
  betId: string,
  newAmount: number
): Promise<IncreaseBetResult> {
  if (!Number.isInteger(newAmount) || newAmount < 10) {
    return { success: false, error: 'MIN_BET' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  // 배팅 대상 예측이 마감/정산되지 않았는지 확인
  const { data: bet } = await supabase
    .from('bets')
    .select('prediction_id, predictions(is_settled, manually_locked, race_id, session_type)')
    .eq('id', betId)
    .eq('user_id', user.id)
    .single()

  if (!bet) return { success: false, error: 'BET_NOT_FOUND' }

  const pred = bet.predictions as unknown as {
    is_settled: boolean
    manually_locked: boolean
    race_id: string
    session_type: string
  } | null

  if (pred?.is_settled) return { success: false, error: 'ALREADY_SETTLED' }
  if (pred?.manually_locked) return { success: false, error: 'BETTING_LOCKED' }

  if (pred) {
    const { data: race } = await supabase
      .from('races')
      .select('race_date, qualifying_date, sprint_date, sprint_qualifying_date, betting_locked')
      .eq('id', pred.race_id)
      .single()

    if (race) {
      if (race.betting_locked) return { success: false, error: 'BETTING_LOCKED' }

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

  const { data, error } = await supabase.rpc('increase_bet', {
    p_user_id: user.id,
    p_bet_id: betId,
    p_new_amount: newAmount,
  })

  if (error) return { success: false, error: error.message }
  return data as IncreaseBetResult
}
