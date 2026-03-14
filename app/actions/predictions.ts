'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createPrediction(
  raceId: string,
  question: string,
  options: string[],
  predictionType: 'race_winner' | 'custom'
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
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/predict/${raceId}`)
  return { success: true }
}
