'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('UNAUTHORIZED')
  }
}

export async function toggleRaceBettingLock(raceId: string, locked: boolean) {
  await checkAdmin()
  const admin = createAdminClient()
  await admin.from('races').update({ betting_locked: locked }).eq('id', raceId)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function togglePredictionManualLock(predictionId: string, locked: boolean) {
  await checkAdmin()
  const admin = createAdminClient()
  await admin.from('predictions').update({ manually_locked: locked }).eq('id', predictionId)
  revalidatePath('/admin')
}
