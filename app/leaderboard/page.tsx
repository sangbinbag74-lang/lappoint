import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const tab = searchParams.tab === 'hitrate' ? 'hitrate' : 'wealth'
  const supabase = await createClient()

  // 자산 랭킹: point_balance 내림차순 상위 100명
  const { data: wealthRanking } = await supabase
    .from('users')
    .select('id, nickname, point_balance')
    .order('point_balance', { ascending: false })
    .limit(100)

  // 적중률 랭킹: hit_rate 내림차순 상위 50명 (NULL 제외 = 5회 이상 배팅)
  const { data: hitrateRanking } = await supabase
    .from('user_hit_rates')
    .select('id, nickname, hit_rate, win_count, settled_count, total_bets')
    .not('hit_rate', 'is', null)
    .order('hit_rate', { ascending: false })
    .limit(50)

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { label: '🥇', className: 'text-yellow-500 font-black text-base' }
    if (rank === 2) return { label: '🥈', className: 'text-gray-400 font-black text-base' }
    if (rank === 3) return { label: '🥉', className: 'text-amber-600 font-black text-base' }
    return { label: String(rank), className: 'text-gray-400 font-bold text-sm tabular-nums' }
  }

  const getRowHighlight = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50'
    if (rank === 2) return 'bg-gray-50'
    if (rank === 3) return 'bg-amber-50/50'
    return ''
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-black text-gray-900">랭킹</h1>
      </div>

      {/* 탭 — 밑줄 스타일 */}
      <div className="flex gap-0 border-b border-gray-200">
        <Link
          href="/leaderboard"
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === 'wealth'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          자산 랭킹
        </Link>
        <Link
          href="/leaderboard?tab=hitrate"
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === 'hitrate'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          적중률 랭킹
        </Link>
      </div>

      {/* 자산 랭킹 테이블 */}
      {tab === 'wealth' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_auto] px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-gray-400 text-xs font-bold uppercase">#</span>
            <span className="text-gray-400 text-xs font-bold uppercase">닉네임</span>
            <span className="text-gray-400 text-xs font-bold uppercase text-right">보유 포인트</span>
          </div>
          <div className="divide-y divide-gray-100">
            {wealthRanking && wealthRanking.length > 0 ? (
              wealthRanking.map((user, index) => {
                const rank = index + 1
                const { label, className: rankClassName } = getRankDisplay(rank)
                const rowHighlight = getRowHighlight(rank)
                return (
                  <div
                    key={user.id}
                    className={`grid grid-cols-[3rem_1fr_auto] items-center px-4 py-3 ${rowHighlight}`}
                  >
                    <span className={`${rankClassName} w-8 text-center`}>{label}</span>
                    <span className="text-gray-900 text-sm font-medium truncate">{user.nickname}</span>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-orange-500 text-xs font-black">P</span>
                      <span className="text-gray-900 text-sm font-bold tabular-nums">
                        {user.point_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                랭킹 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 적중률 랭킹 테이블 */}
      {tab === 'hitrate' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-[3rem_1fr_auto_auto] w-full gap-2">
              <span className="text-gray-400 text-xs font-bold uppercase">#</span>
              <span className="text-gray-400 text-xs font-bold uppercase">닉네임</span>
              <span className="text-gray-400 text-xs font-bold uppercase text-right">적중률</span>
              <span className="text-gray-400 text-xs font-bold uppercase text-right">적중/정산</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs px-4 pt-2 pb-1">
            * 최소 5회 배팅 참여자만 집계됩니다.
          </p>
          <div className="divide-y divide-gray-100">
            {hitrateRanking && hitrateRanking.length > 0 ? (
              hitrateRanking.map((user, index) => {
                const rank = index + 1
                const { label, className: rankClassName } = getRankDisplay(rank)
                const rowHighlight = getRowHighlight(rank)
                return (
                  <div
                    key={user.id}
                    className={`grid grid-cols-[3rem_1fr_auto_auto] items-center px-4 py-3 gap-2 ${rowHighlight}`}
                  >
                    <span className={`${rankClassName} w-8 text-center`}>{label}</span>
                    <span className="text-gray-900 text-sm font-medium truncate">{user.nickname}</span>
                    <span className="text-gray-900 text-sm font-bold tabular-nums text-right">
                      {user.hit_rate}%
                    </span>
                    <span className="text-gray-400 text-xs tabular-nums text-right whitespace-nowrap">
                      {user.win_count}/{user.settled_count}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                아직 자격을 갖춘 참여자가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
