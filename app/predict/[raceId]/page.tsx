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

  const { data: race } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single()

  if (!race) notFound()

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, question, options')
    .eq('race_id', raceId)
    .order('created_at', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

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
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const statusConfig: Record<string, { label: string; className: string }> = {
    upcoming: { label: '예측 가능', className: 'text-green-700 bg-green-50 border-green-200' },
    active:   { label: '진행 중',   className: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    completed:{ label: '종료',      className: 'text-gray-500 bg-gray-100 border-gray-200' },
  }
  const status = statusConfig[race.status] ?? statusConfig.upcoming

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 경기 헤더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1">F1 그랑프리</p>
            <h1 className="text-xl font-black text-gray-900">{race.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{raceDate}</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${status.className}`}>
            {status.label}
          </span>
        </div>

        {user && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-orange-500 text-xs font-bold">P</span>
              <span className="text-gray-800 font-bold tabular-nums">{pointBalance.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">보유</span>
            </div>
            <AttendanceButton />
          </div>
        )}
      </div>

      {/* 예측 항목 */}
      {predictions && predictions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-600 px-1">
            예측 항목 {predictions.length}개
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
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 shadow-sm text-sm">
          아직 예측 항목이 없습니다.
        </div>
      )}

      {!user && (
        <p className="text-center text-gray-500 text-sm py-4">
          배팅에 참여하려면 <span className="text-gray-900 font-semibold">Google 로그인</span>이 필요합니다.
        </p>
      )}
    </div>
  )
}
