import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import AttendanceButton from '@/components/AttendanceButton'

// ─── 칭호 시스템 ────────────────────────────────────────────
type Badge = {
  label: string
  color: string
}

function getBadge(hitRate: number | null, totalBets: number): Badge {
  if (hitRate !== null && hitRate >= 80) {
    return { label: '🏆 Scuderia Master', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' }
  }
  if (hitRate !== null && hitRate >= 60) {
    return { label: '🎯 Race Strategist', color: 'text-orange-700 bg-orange-50 border-orange-300' }
  }
  if (totalBets >= 50) {
    return { label: '🔥 Tifosi', color: 'text-red-700 bg-red-50 border-red-300' }
  }
  if (totalBets >= 20) {
    return { label: '🏁 Paddock Pass', color: 'text-blue-700 bg-blue-50 border-blue-300' }
  }
  return { label: '🚀 Rookie', color: 'text-gray-600 bg-gray-100 border-gray-300' }
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
    .select('nickname, point_balance, created_at, avatar_url')
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

  if (bets) {
    for (const bet of bets) {
      const pred = (bet.predictions as unknown) as {
        is_settled: boolean
        correct_option: string | null
      } | null
      if (!pred || !pred.is_settled) continue
      if (pred.correct_option === bet.selected_option) {
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
        badge: 'text-yellow-700 bg-yellow-50 border-yellow-300',
        row: '',
      }
    }
    if (pred.correct_option === selectedOption) {
      return {
        label: '적중 ✓',
        badge: 'text-green-700 bg-green-50 border-green-300',
        row: '',
      }
    }
    return {
      label: '실패 ✗',
      badge: 'text-red-600 bg-red-50 border-red-200',
      row: '',
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 유저 요약 카드 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* 아바타 */}
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200">
              {userData?.avatar_url ? (
                <Image src={userData.avatar_url} alt="프로필" fill className="object-cover" unoptimized />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">{userData?.nickname}</h1>
                <Link href="/mypage/edit" className="text-xs text-blue-600 hover:underline font-medium">수정</Link>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              {/* 칭호 뱃지 */}
              <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <p className="text-gray-400 text-xs mb-1">보유 포인트</p>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-orange-500 font-black">P</span>
                <span className="text-2xl font-black text-gray-900">
                  {userData?.point_balance.toLocaleString()}
                </span>
              </div>
            </div>
            <AttendanceButton />
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-gray-900">{totalBets}</p>
            <p className="text-gray-400 text-xs mt-0.5">총 참여</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-600">{winCount}</p>
            <p className="text-gray-400 text-xs mt-0.5">적중</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-500">{lossCount}</p>
            <p className="text-gray-400 text-xs mt-0.5">실패</p>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">
              {hitRate !== null ? `${hitRate}%` : '-'}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">적중률</p>
          </div>
        </div>
      </div>

      {/* 배팅 내역 */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-3">최근 참여 내역</h2>

        {bets && bets.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
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
                <div key={bet.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs truncate">
                        {pred?.races?.name ?? '알 수 없는 경기'}
                      </p>
                      <p className="text-gray-900 text-sm font-medium mt-0.5 leading-snug">
                        {pred?.question ?? '삭제된 예측 항목'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-gray-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        선택: <span className="text-gray-700 font-medium">{bet.selected_option}</span>
                      </span>
                      {pred?.is_settled && pred.correct_option && pred.correct_option !== bet.selected_option && (
                        <span className="text-gray-400">
                          정답: {pred.correct_option}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{bet.bet_amount.toLocaleString()}P 참여</span>
                      {payout !== null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-green-600 font-bold">+{payout.toLocaleString()}P</span>
                        </>
                      )}
                      <span className="text-gray-300">·</span>
                      <span>{betDate}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-400">
            아직 참여 내역이 없습니다.
          </div>
        )}
      </section>
    </div>
  )
}
