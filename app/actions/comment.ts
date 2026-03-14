'use server'

import { createClient } from '@/lib/supabase/server'

type CommentResult = { success: true } | { success: false; error: string }

const PROFANITY_LIST = ['시발', '씨발', '개새끼', '병신', '지랄', '미친놈', '새끼', '씹', '꺼져', '죽어', 'fuck', 'shit', 'asshole', 'bastard']

function hasProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return PROFANITY_LIST.some(w => lower.includes(w))
}

export async function postBetComment(
  betId: string,
  predictionId: string,
  content: string
): Promise<CommentResult> {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 100) {
    return { success: false, error: 'INVALID_CONTENT' }
  }
  if (hasProfanity(trimmed)) {
    return { success: false, error: 'PROFANITY' }
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

export async function editComment(
  commentId: string,
  content: string
): Promise<CommentResult> {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 100) {
    return { success: false, error: 'INVALID_CONTENT' }
  }
  if (hasProfanity(trimmed)) {
    return { success: false, error: 'PROFANITY' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { error } = await supabase
    .from('bet_comments')
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteComment(
  commentId: string
): Promise<CommentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { error } = await supabase
    .from('bet_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function toggleLike(
  commentId: string
): Promise<CommentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: user.id })
    if (error) return { success: false, error: error.message }
  }
  return { success: true }
}
