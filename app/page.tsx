import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status')
    .order('race_date', { ascending: true })
    .limit(10)

  const { data: topUsers } = await supabase
    .from('users')
    .select('nickname, point_balance')
    .order('point_balance', { ascending: false })
    .limit(3)

  const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
    upcoming: { label: '예측 가능', dot: 'bg-green-500', text: 'text-green-700' },
    active:   { label: '진행 중',   dot: 'bg-yellow-500', text: 'text-yellow-700' },
    completed:{ label: '종료',      dot: 'bg-gray-400',  text: 'text-gray-500' },
  }
  const rankIcons = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-10">
      {/* 헤더 배너 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2800]" />
              <span className="text-[#FF2800] text-xs font-bold">2026 F1 시즌</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              F1 그랑프리 결과를 예측하고
              <br />
              <span className="text-[#FF2800]">포인트를 획득</span>하세요
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              가입 즉시 <span className="text-orange-500 font-bold">1,000P</span> 지급 · 매일 출석 체크로 <span className="font-medium">+100P</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 경기 목록 */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">그랑프리 일정</h2>
            {races && <span className="text-gray-400 text-sm">{races.length}경기</span>}
          </div>

          {races && races.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {races.map((race) => {
                const date = new Date(race.race_date).toLocaleDateString('ko-KR', {
                  month: 'short', day: 'numeric', weekday: 'short',
                })
                const cfg = statusConfig[race.status] ?? statusConfig.upcoming
                const isCompleted = race.status === 'completed'

                return (
                  <Link
                    key={race.id}
                    href={isCompleted ? '#' : `/predict/${race.id}`}
                    className={`flex items-center justify-between px-4 py-3.5 transition-colors group
                      ${isCompleted ? 'opacity-50 cursor-default' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <span className="text-gray-800 font-medium text-sm truncate group-hover:text-gray-900">
                        {race.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className="text-gray-400 text-xs hidden sm:block">{date}</span>
                      {!isCompleted && (
                        <span className="text-blue-600 text-xs font-semibold group-hover:underline">
                          예측하기 →
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 shadow-sm">
              등록된 경기 일정이 없습니다.
            </div>
          )}
        </section>

        {/* 상위 랭커 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">이번 시즌 TOP 3</h2>
            <Link href="/leaderboard" className="text-blue-600 text-sm hover:underline">
              전체 보기
            </Link>
          </div>

          {topUsers && topUsers.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{rankIcons[i]}</span>
                    <span className="text-gray-800 font-medium text-sm">{u.nickname}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500 text-xs font-bold">P</span>
                    <span className="text-gray-700 font-bold text-sm tabular-nums">
                      {u.point_balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 shadow-sm text-sm">
              아직 참가자가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
