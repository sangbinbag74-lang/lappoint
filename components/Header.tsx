import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AuthButton from './AuthButton'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let pointBalance: number | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('point_balance')
      .eq('id', user.id)
      .single()
    pointBalance = data?.point_balance ?? 0
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-1">
          <span className="text-[#FF2800] font-black text-xl tracking-tight">LAP</span>
          <span className="text-white font-black text-xl tracking-tight">POINT</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            일정
          </Link>
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            랭킹
          </Link>
        </nav>

        {/* 우측: 포인트 + 마이페이지 + 로그인 */}
        <div className="flex items-center gap-3">
          {user && pointBalance !== null && (
            <Link
              href="/mypage"
              className="bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
              title="마이페이지"
            >
              <span className="text-[#FF2800] text-xs font-black">P</span>
              <span className="text-white text-sm font-semibold">
                {pointBalance.toLocaleString()}
              </span>
            </Link>
          )}
          <AuthButton user={user} />
        </div>
      </div>
    </header>
  )
}
