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
