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

  const { data, error } = await supabase.rpc('place_bet', {
    p_user_id: user.id,
    p_prediction_id: predictionId,
    p_selected_option: selectedOption,
    p_bet_amount: betAmount,
  })

  if (error) return { success: false, error: error.message }
  return data as BetResult
}
