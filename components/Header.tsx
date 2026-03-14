import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AuthButton from './AuthButton'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-0">
          <span className="text-[#FF2800] font-black text-lg tracking-tight">LAP</span>
          <span className="text-gray-900 font-black text-lg tracking-tight">POINT</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            일정
          </Link>
          <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            랭킹
          </Link>
        </nav>

        {/* 우측: 포인트 + 로그인 */}
        <div className="flex items-center gap-2">
          {user && pointBalance !== null && (
            <Link
              href="/mypage"
              className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
            >
              <span className="text-orange-500 text-xs font-black">P</span>
              <span className="text-orange-700 text-sm font-semibold tabular-nums">
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
