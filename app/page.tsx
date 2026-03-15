import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getRaceCountryCode } from '@/lib/constants/raceFlags'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: upcomingRaces } = await supabase
    .from('races')
    .select('id, name, race_date, status, betting_locked')
    .in('status', ['upcoming', 'active'])
    .order('race_date', { ascending: true })

  const { data: recentCompleted } = await supabase
    .from('races')
    .select('id, name, race_date, status')
    .eq('status', 'completed')
    .order('race_date', { ascending: false })
    .limit(1)

  const { data: topUsers } = await supabase
    .from('users')
    .select('nickname, point_balance')
    .order('point_balance', { ascending: false })
    .limit(3)

  const rankIcons = ['🥇', '🥈', '🥉']

  const RaceRow = ({ race, isCompleted = false }: {
    race: { id: string; name: string; race_date: string; status: string; betting_locked?: boolean }
    isCompleted?: boolean
  }) => {
    const date = new Date(race.race_date).toLocaleDateString('ko-KR', {
      month: 'short', day: 'numeric', weekday: 'short',
    })
    const isLocked = race.betting_locked ?? false
    const countryCode = getRaceCountryCode(race.name)

    return (
      <Link
        href={`/predict/${race.id}`}
        className={`relative flex items-center justify-between px-4 py-3.5 overflow-hidden transition-colors group hover:bg-gray-50/80 ${isLocked ? 'opacity-50 grayscale' : ''}`}
      >
        {/* 국기 이미지 오버레이 (우측에서 좌측으로 그라데이션 페이드) */}
        {countryCode && (
          <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none overflow-hidden">
            <Image
              src={`https://flagcdn.com/w320/${countryCode}.png`}
              alt=""
              fill
              className="object-cover object-top opacity-70"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
          </div>
        )}

        <div className="relative flex items-center gap-3 min-w-0">
          <span className="text-gray-800 font-medium text-sm truncate group-hover:text-gray-900">
            {countryCode && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://flagcdn.com/24x18/${countryCode}.png`} alt={countryCode} className="inline-block w-6 h-4 mr-1.5 align-middle rounded-sm" />
            )}{race.name}
          </span>
        </div>
        <div className="relative flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-gray-500 text-xs hidden sm:block bg-white/80 px-1.5 py-0.5 rounded">{date}</span>
          {!isLocked && (
            <span className={`text-xs font-semibold group-hover:underline ${isCompleted ? 'text-gray-500' : 'text-blue-600'}`}>
              {isCompleted ? '결과 보기 →' : '예측하기 →'}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-10">
      {/* 헤더 배너 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
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
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 경기 목록 */}
        <section className="lg:col-span-2 space-y-6">

          {/* 예정/진행 중 경기 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">그랑프리 일정</h2>
              {upcomingRaces && <span className="text-gray-400 text-sm">{upcomingRaces.length}경기</span>}
            </div>
            {upcomingRaces && upcomingRaces.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                {upcomingRaces.map((race) => (
                  <RaceRow key={race.id} race={race} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 shadow-sm">
                예정된 경기 일정이 없습니다.
              </div>
            )}
          </div>

          {/* 직전 완료 경기 */}
          {recentCompleted && recentCompleted.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-800">직전 경기</h2>
                <Link href="/races" className="text-blue-600 text-sm hover:underline">
                  이전 경기 전체 보기 →
                </Link>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                {recentCompleted.map((race) => (
                  <RaceRow key={race.id} race={race} isCompleted />
                ))}
              </div>
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
