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
        className="bg-[#FF2800] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
      >
        Google로 로그인
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-300 text-sm hidden sm:block">
        {user.user_metadata.full_name}
      </span>
      <button
        onClick={handleLogout}
        className="border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white py-2 px-3 rounded-md text-sm transition-colors"
      >
        로그아웃
      </button>
    </div>
  )
}
