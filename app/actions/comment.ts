'use server'

import { createClient } from '@/lib/supabase/server'

type CommentResult = { success: true } | { success: false; error: string }

export async function postBetComment(
  betId: string,
  predictionId: string,
  content: string
): Promise<CommentResult> {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 100) {
    return { success: false, error: 'INVALID_CONTENT' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { error } = await supabase
    .from('bet_comments')
    .insert({
      bet_id: betId,
      prediction_id: predictionId,
      user_id: user.id,
      content: trimmed,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
