'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function AuthButton({ user }: { user: User | null }) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="bg-gray-900 hover:bg-gray-700 text-white font-bold py-1.5 px-4 rounded-full text-sm transition-colors"
      >
        Google로 로그인
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-sm hidden sm:block">
        {user.user_metadata.full_name}
      </span>
      <button
        onClick={handleLogout}
        className="border border-gray-300 hover:border-gray-400 text-gray-500 hover:text-gray-700 py-1.5 px-3 rounded-full text-sm transition-colors"
      >
        로그아웃
      </button>
    </div>
  )
}
