'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleRaceBettingLock(raceId: string, locked: boolean) {
  const supabase = await createClient()
  await supabase.from('races').update({ betting_locked: locked }).eq('id', raceId)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function togglePredictionManualLock(predictionId: string, locked: boolean) {
  const supabase = await createClient()
  await supabase.from('predictions').update({ manually_locked: locked }).eq('id', predictionId)
  revalidatePath('/admin')
}
