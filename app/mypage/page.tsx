import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ─── 칭호 시스템 ────────────────────────────────────────────
type Badge = {
  label: string
  color: string
}

function getBadge(hitRate: number | null, totalBets: number): Badge {
  if (hitRate !== null && hitRate >= 80) {
    return { label: '🏆 Scuderia Master', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40' }
  }
  if (hitRate !== null && hitRate >= 60) {
    return { label: '🎯 Race Strategist', color: 'text-orange-400 bg-orange-400/10 border-orange-400/40' }
  }
  if (totalBets >= 50) {
    return { label: '🔥 Tifosi', color: 'text-[#FF2800] bg-red-900/20 border-red-700/50' }
  }
  if (totalBets >= 20) {
    return { label: '🏁 Paddock Pass', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' }
  }
  return { label: '🚀 Rookie', color: 'text-gray-400 bg-gray-800 border-gray-700' }
}

export default async function MyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // 유저 정보 조회
  const { data: userData } = await supabase
    .from('users')
    .select('nickname, point_balance, created_at')
    .eq('id', user.id)
    .single()

  // 적중률 View 조회
  const { data: hitRateData } = await supabase
    .from('user_hit_rates')
    .select('hit_rate, win_count, settled_count, total_bets')
    .eq('id', user.id)
    .single()

  // 배팅 내역 조회 (최근 20건, 예측 + 경기 정보 포함)
  const { data: bets } = await supabase
    .from('bets')
    .select(`
      id,
      selected_option,
      bet_amount,
      fee_amount,
      created_at,
      predictions (
        id,
        question,
        correct_option,
        is_settled,
        races (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // 배팅별 배당금 조회 (bet_id로 매핑)
  const { data: payoutLogs } = await supabase
    .from('point_logs')
    .select('bet_id, amount')
    .eq('user_id', user.id)
    .eq('action_type', 'win_payout')
    .not('bet_id', 'is', null)

  const payoutMap = new Map<string, number>()
  if (payoutLogs) {
    for (const log of payoutLogs) {
      if (log.bet_id) payoutMap.set(log.bet_id, log.amount)
    }
  }

  // 통계 계산
  let winCount = 0
  let lossCount = 0
  let pendingCount = 0

  if (bets) {
    for (const bet of bets) {
      const pred = (bet.predictions as unknown) as {
        is_settled: boolean
        correct_option: string | null
      } | null
      if (!pred) continue
      if (!pred.is_settled) {
        pendingCount++
      } else if (pred.correct_option === bet.selected_option) {
        winCount++
      } else {
        lossCount++
      }
    }
  }

  const totalBets = hitRateData?.total_bets ?? 0
  const hitRate = hitRateData?.hit_rate ?? null
  const badge = getBadge(hitRate, totalBets)

  const getBetStyle = (pred: {
    is_settled: boolean
    correct_option: string | null
  } | null, selectedOption: string) => {
    if (!pred || !pred.is_settled) {
      return {
        label: '대기 중',
        badge: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50',
        row: 'border-yellow-700/20',
      }
    }
    if (pred.correct_option === selectedOption) {
      return {
        label: '적중 ✓',
        badge: 'text-green-400 bg-green-900/30 border-green-700',
        row: 'border-green-700/30',
      }
    }
    return {
      label: '실패 ✗',
      badge: 'text-red-400 bg-red-900/20 border-red-800',
      row: 'border-gray-800',
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 유저 요약 카드 */}
      <div className="bg-gray-900 border border-gray-800 rounded-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">
              내 프로필
            </p>
            <h1 className="text-2xl font-black text-white">{userData?.nickname}</h1>
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
            {/* 칭호 뱃지 */}
            <span
              className={`inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded border ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">보유 포인트</p>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[#FF2800] font-black">P</span>
              <span className="text-2xl font-black text-white">
                {userData?.point_balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="mt-5 pt-5 border-t border-gray-800 grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-white">{totalBets}</p>
            <p className="text-gray-500 text-xs mt-0.5">총 배팅</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-400">{winCount}</p>
            <p className="text-gray-500 text-xs mt-0.5">적중</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-400">{lossCount}</p>
            <p className="text-gray-500 text-xs mt-0.5">실패</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">
              {hitRate !== null ? `${hitRate}%` : '-'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">적중률</p>
          </div>
        </div>
      </div>

      {/* 배팅 내역 */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">최근 배팅 내역</h2>

        {bets && bets.length > 0 ? (
          <div className="space-y-3">
            {bets.map((bet) => {
              const pred = (bet.predictions as unknown) as {
                question: string
                correct_option: string | null
                is_settled: boolean
                races: { name: string } | null
              } | null
              const style = getBetStyle(pred, bet.selected_option)
              const payout = payoutMap.get(bet.id) ?? null
              const betDate = new Date(bet.created_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={bet.id}
                  className={`bg-gray-900 border rounded-md p-4 ${style.row}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs truncate">
                        {pred?.races?.name ?? '알 수 없는 경기'}
                      </p>
                      <p className="text-white text-sm font-medium mt-0.5 leading-snug">
                        {pred?.question ?? '삭제된 예측 항목'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">
                        선택:{' '}
                        <span className="text-white font-medium">{bet.selected_option}</span>
                      </span>
                      {pred?.is_settled && pred.correct_option && pred.correct_option !== bet.selected_option && (
                        <span className="text-gray-600 text-xs">
                          정답: {pred.correct_option}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">{bet.bet_amount.toLocaleString()}P 배팅</span>
                      {payout !== null && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-green-400 font-bold">+{payout.toLocaleString()}P</span>
                        </>
                      )}
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500">{betDate}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-md p-10 text-center text-gray-500">
            아직 배팅 내역이 없습니다.
          </div>
        )}
      </section>
    </div>
  )
}
