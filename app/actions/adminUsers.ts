'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== process.env.ADMIN_EMAIL) throw new Error('Unauthorized')
}

export async function suspendCommentUser(userId: string, durationDays: number, reason: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const until = durationDays === -1
    ? new Date('9999-12-31').toISOString()
    : new Date(Date.now() + durationDays * 86400 * 1000).toISOString()
  await admin.from('users')
    .update({ comment_suspended_until: until, comment_suspend_reason: reason })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('users').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/admin/users')
}

export async function deleteComment(commentId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('bet_comments').delete().eq('id', commentId)
  revalidatePath('/admin/users')
}
