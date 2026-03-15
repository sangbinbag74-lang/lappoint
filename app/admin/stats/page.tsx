import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminStatsPage() {
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  // 전체 현황
  const [
    { count: totalUsers },
    { count: totalBets },
    { data: totalBetAmountData },
    { count: totalComments },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('bets').select('*', { count: 'exact', head: true }),
    supabase.from('bets').select('bet_amount'),
    supabase.from('bet_comments').select('*', { count: 'exact', head: true }),
  ])

  const totalBetAmount = totalBetAmountData?.reduce((s, b) => s + b.bet_amount, 0) ?? 0

  // 오늘 현황
  const [
    { count: todayUsers },
    { count: todayBets },
    { data: todayBetAmountData },
    { count: todayComments },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
    supabase.from('bets').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
    supabase.from('bets').select('bet_amount').gte('created_at', todayIso),
    supabase.from('bet_comments').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
  ])

  const todayBetAmount = todayBetAmountData?.reduce((s, b) => s + b.bet_amount, 0) ?? 0

  // 최근 가입 회원
  const { data: recentUsers } = await supabase
    .from('users')
    .select('nickname, created_at, point_balance')
    .order('created_at', { ascending: false })
    .limit(10)

  // 포인트 상위 10명
  const { data: topPointUsers } = await supabase
    .from('users')
    .select('nickname, point_balance')
    .order('point_balance', { ascending: false })
    .limit(10)

  // 배팅 상위 10명 (집계는 클라이언트에서)
  const { data: allBetsForRank } = await supabase
    .from('bets')
    .select('user_id, bet_amount, users(nickname)')

  const betCountByUser = new Map<string, { nickname: string; count: number; total: number }>()
  if (allBetsForRank) {
    for (const b of allBetsForRank) {
      const uid = b.user_id
      const nickname = (b.users as unknown as { nickname: string } | null)?.nickname ?? '알 수 없음'
      const cur = betCountByUser.get(uid) ?? { nickname, count: 0, total: 0 }
      betCountByUser.set(uid, { nickname, count: cur.count + 1, total: cur.total + b.bet_amount })
    }
  }
  const topBettors = Array.from(betCountByUser.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 인기 예측 항목 TOP 10
  const { data: allBetsForPred } = await supabase
    .from('bets')
    .select('prediction_id, predictions(question, races(name))')

  const betCountByPred = new Map<string, { question: string; raceName: string; count: number }>()
  if (allBetsForPred) {
    for (const b of allBetsForPred) {
      const pid = b.prediction_id
      const pred = b.predictions as unknown as { question: string; races: { name: string } | null } | null
      const question = pred?.question ?? '-'
      const raceName = pred?.races?.name ?? '-'
      const cur = betCountByPred.get(pid) ?? { question, raceName, count: 0 }
      betCountByPred.set(pid, { ...cur, count: cur.count + 1 })
    }
  }
  const topPredictions = Array.from(betCountByPred.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 경기별 현황
  const { data: races } = await supabase
    .from('races')
    .select('id, name, round, race_date, status')
    .order('race_date', { ascending: false })

  const { data: predStats } = await supabase
    .from('predictions')
    .select('race_id, is_settled')

  const { data: betsByRace } = await supabase
    .from('bets')
    .select('prediction_id, predictions(race_id)')

  const predByRace = new Map<string, { total: number; settled: number }>()
  if (predStats) {
    for (const p of predStats) {
      const cur = predByRace.get(p.race_id) ?? { total: 0, settled: 0 }
      predByRace.set(p.race_id, {
        total: cur.total + 1,
        settled: cur.settled + (p.is_settled ? 1 : 0),
      })
    }
  }

  const betsByRaceMap = new Map<string, number>()
  if (betsByRace) {
    for (const b of betsByRace) {
      const raceId = (b.predictions as unknown as { race_id: string } | null)?.race_id
      if (raceId) betsByRaceMap.set(raceId, (betsByRaceMap.get(raceId) ?? 0) + 1)
    }
  }

  const statCard = (label: string, value: string | number, sub?: string) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-gray-900 font-black text-2xl tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← 어드민</Link>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Stats</span>
          <h1 className="text-xl font-black text-gray-900">통계 대시보드</h1>
        </div>
        <p className="text-gray-400 text-xs">{new Date().toLocaleString('ko-KR')}</p>
      </div>

      {/* 전체 현황 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">전체 현황</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCard('총 회원', totalUsers ?? 0, '명')}
          {statCard('총 참여', totalBets ?? 0, '건')}
          {statCard('총 참여 포인트', totalBetAmount, 'P')}
          {statCard('총 댓글', totalComments ?? 0, '개')}
        </div>
      </section>

      {/* 오늘 현황 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">오늘 현황</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCard('신규 가입', todayUsers ?? 0, '명')}
          {statCard('오늘 참여', todayBets ?? 0, '건')}
          {statCard('오늘 참여 포인트', todayBetAmount, 'P')}
          {statCard('오늘 댓글', todayComments ?? 0, '개')}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 가입 회원 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">최근 가입 회원</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {recentUsers?.map((u, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-400 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <span className="text-gray-800 text-sm font-medium truncate">{u.nickname}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-orange-500 text-xs font-bold tabular-nums">{u.point_balance.toLocaleString()}P</span>
                  <span className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 포인트 TOP 10 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">포인트 TOP 10</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {topPointUsers?.map((u, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                  <span className="text-gray-800 text-sm font-medium">{u.nickname}</span>
                </div>
                <span className="text-orange-500 font-bold text-sm tabular-nums">{u.point_balance.toLocaleString()}P</span>
              </div>
            ))}
          </div>
        </section>

        {/* 배팅 많이 한 유저 TOP 10 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">참여 횟수 TOP 10</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {topBettors.map((u, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                  <span className="text-gray-800 text-sm font-medium">{u.nickname}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs">{u.count}건</span>
                  <span className="text-orange-500 text-xs font-bold tabular-nums">{u.total.toLocaleString()}P</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 인기 예측 항목 TOP 10 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">인기 예측 항목 TOP 10</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {topPredictions.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-400 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{p.question}</p>
                    <p className="text-gray-400 text-xs truncate">{p.raceName}</p>
                  </div>
                </div>
                <span className="text-blue-600 text-sm font-bold flex-shrink-0">{p.count}건</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 경기별 현황 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">경기별 현황</h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">경기</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">예측수</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">정산</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">참여수</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {races?.map((race) => {
                const pStats = predByRace.get(race.id) ?? { total: 0, settled: 0 }
                const bCount = betsByRaceMap.get(race.id) ?? 0
                const statusColor: Record<string, string> = {
                  upcoming: 'text-green-700',
                  active: 'text-yellow-700',
                  completed: 'text-gray-400',
                }
                const statusLabel: Record<string, string> = {
                  upcoming: '예측 가능',
                  active: '진행 중',
                  completed: '종료',
                }
                return (
                  <tr key={race.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {race.round && <span className="text-gray-400 text-xs">R{race.round}</span>}
                        <span className="text-gray-800 font-medium">{race.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{pStats.total}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{pStats.settled}/{pStats.total}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{bCount}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-medium ${statusColor[race.status] ?? 'text-gray-400'}`}>
                        {statusLabel[race.status] ?? race.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
