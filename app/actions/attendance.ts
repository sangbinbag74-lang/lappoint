'use server'

import { createClient } from '@/lib/supabase/server'

type AttendanceResult =
  | { success: true; reward: number }
  | { success: false; error: string }

export async function checkAttendance(): Promise<AttendanceResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { data, error } = await supabase.rpc('check_attendance', {
    p_user_id: user.id,
  })

  if (error) return { success: false, error: error.message }
  return data as AttendanceResult
}
