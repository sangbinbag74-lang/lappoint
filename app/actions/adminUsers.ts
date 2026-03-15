'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== process.env.ADMIN_EMAIL) throw new Error('Unauthorized')
}

export async function suspendUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('users').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/admin/users')
}
