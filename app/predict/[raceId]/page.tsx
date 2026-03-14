import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BettingCard from '@/components/BettingCard'
import AttendanceButton from '@/components/AttendanceButton'

interface PageProps {
  params: Promise<{ raceId: string }>
}

export default async function PredictPage({ params }: PageProps) {
  const { raceId } = await params
  const supabase = await createClient()

  // 경기 정보 조회
  const { data: race } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single()

  if (!race) notFound()

  // 예측 항목 목록 조회
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, question, options')
    .eq('race_id', raceId)
    .order('created_at', { ascending: true })

  // 현재 유저 + 포인트 조회
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let pointBalance = 0
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('point_balance')
      .eq('id', user.id)
      .single()
    pointBalance = userData?.point_balance ?? 0
  }

  const raceDate = new Date(race.race_date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const statusLabel: Record<string, string> = {
    upcoming: '예측 가능',
    active: '진행 중',
    completed: '종료',
  }
  const statusColor: Record<string, string> = {
    upcoming: 'text-green-400 bg-green-400/10 border-green-400/30',
    active: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    completed: 'text-gray-500 bg-gray-800 border-gray-700',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 경기 헤더 */}
      <div className="bg-gray-900 border border-gray-800 rounded-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">
              F1 그랑프리
            </p>
            <h1 className="text-2xl font-black text-white">{race.name}</h1>
            <p className="text-gray-400 text-sm mt-2">{raceDate}</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border whitespace-nowrap ${statusColor[race.status] ?? statusColor.upcoming}`}
          >
            {statusLabel[race.status] ?? race.status}
          </span>
        </div>

        {/* 로그인 유저 포인트 + 출석 체크 */}
        {user && (
          <div className="mt-5 pt-5 border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[#FF2800] text-xs font-black">P</span>
              <span className="text-white font-bold">{pointBalance.toLocaleString()}</span>
              <span className="text-gray-500 text-sm">보유</span>
            </div>
            <AttendanceButton />
          </div>
        )}
      </div>

      {/* 예측 항목 목록 */}
      {predictions && predictions.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">
            예측 항목 <span className="text-gray-500 font-normal text-sm">{predictions.length}개</span>
          </h2>
          {predictions.map((pred) => (
            <BettingCard
              key={pred.id}
              prediction={{
                id: pred.id,
                question: pred.question,
                options: pred.options as string[],
              }}
              userBalance={pointBalance}
              isLoggedIn={!!user}
            />
          ))}
        </section>
      ) : (
        <div className="text-center py-12 text-gray-500">
          아직 예측 항목이 없습니다.
        </div>
      )}

      {!user && (
        <p className="text-center text-gray-500 text-sm">
          배팅에 참여하려면 <span className="text-[#FF2800]">Google 로그인</span>이 필요합니다.
        </p>
      )}
    </div>
  )
}
