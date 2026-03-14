'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ProfileResult = { success: true } | { success: false; error: string }

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const nickname = (formData.get('nickname') as string)?.trim()
  const avatarFile = formData.get('avatar') as File | null

  if (!nickname || nickname.length < 1 || nickname.length > 20) {
    return { success: false, error: 'INVALID_NICKNAME' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  let avatarUrl: string | undefined

  // 아바타 업로드 (파일이 있는 경우)
  if (avatarFile && avatarFile.size > 0) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const ext = avatarFile.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}.${ext}`
    const arrayBuffer = await avatarFile.arrayBuffer()
    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: avatarFile.type,
        upsert: true,
      })
    if (uploadError) return { success: false, error: uploadError.message }
    const { data: urlData } = adminSupabase.storage.from('avatars').getPublicUrl(path)
    avatarUrl = urlData.publicUrl
  }

  const updateData: Record<string, string> = { nickname }
  if (avatarUrl) updateData.avatar_url = avatarUrl

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/mypage')
  revalidatePath('/mypage/edit')
  return { success: true }
}
