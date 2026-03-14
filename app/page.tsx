import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  // races 테이블에서 경기 목록 조회 (최신 10개)
  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status')
    .order('race_date', { ascending: true })
    .limit(10)

  // TOP 3 유저
  const { data: topUsers } = await supabase
    .from('users')
    .select('nickname, point_balance')
    .order('point_balance', { ascending: false })
    .limit(3)

  const statusLabel: Record<string, string> = {
    upcoming: '예측 가능',
    active: '진행 중',
    completed: '종료',
  }
  const rankColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600']

  return (
    <div className="space-y-12">
      {/* 히어로 섹션 */}
      <section className="text-center py-12">
        <div className="inline-block bg-[#FF2800]/10 border border-[#FF2800]/30 rounded-full px-4 py-1 text-[#FF2800] text-xs font-bold tracking-widest uppercase mb-4">
          2025 F1 시즌
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          <span className="text-[#FF2800]">F1</span> 승부를 예측하고
          <br />
          <span className="text-white">포인트를 획득하세요</span>
        </h1>
        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-xl mx-auto">
          다가오는 그랑프리 결과를 예측하고 리더보드 정상에 올라보세요.
          <br />
          가입 즉시 <span className="text-[#FF2800] font-bold">1,000 포인트</span>를 드립니다.
        </p>
      </section>

      {/* 다가오는 경기 목록 */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">그랑프리 일정</h2>
          {races && (
            <span className="text-gray-500 text-sm">{races.length}경기</span>
          )}
        </div>

        {races && races.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {races.map((race) => {
              const date = new Date(race.race_date).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })
              const isCompleted = race.status === 'completed'

              return (
                <Link
                  key={race.id}
                  href={`/predict/${race.id}`}
                  className={`bg-gray-900 border rounded-md p-5 transition-all group block
                    ${isCompleted
                      ? 'border-gray-800 opacity-60 cursor-not-allowed pointer-events-none'
                      : 'border-gray-800 hover:border-[#FF2800]/50 hover:bg-gray-900/80'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border
                        ${race.status === 'upcoming'
                          ? 'text-green-400 bg-green-400/10 border-green-400/20'
                          : race.status === 'active'
                          ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                          : 'text-gray-500 bg-gray-800 border-gray-700'
                        }`}
                    >
                      {statusLabel[race.status] ?? race.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white group-hover:text-[#FF2800] transition-colors leading-snug">
                    {race.name}
                  </h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{date}</span>
                    {!isCompleted && (
                      <span className="bg-[#FF2800] group-hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors">
                        예측하기 →
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-md p-10 text-center text-gray-500">
            등록된 경기 일정이 없습니다.
          </div>
        )}
      </section>

      {/* 상위 랭커 */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">이번 시즌 TOP 3</h2>
          <Link href="/leaderboard" className="text-[#FF2800] text-sm hover:underline">
            전체 랭킹 →
          </Link>
        </div>

        {topUsers && topUsers.length > 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-md divide-y divide-gray-800">
            {topUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className={`font-black text-lg w-6 text-center ${rankColors[i]}`}>
                    {i + 1}
                  </span>
                  <span className="text-white font-medium">{u.nickname}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#FF2800] text-xs font-black">P</span>
                  <span className="text-white font-bold">{u.point_balance.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-md p-8 text-center text-gray-500">
            아직 참가자가 없습니다. 첫 번째 예측자가 되어보세요!
          </div>
        )}
      </section>
    </div>
  )
}
