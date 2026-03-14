import { createClient } from '@supabase/supabase-js'

// RLS를 우회하는 service role 클라이언트 (서버 전용)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
