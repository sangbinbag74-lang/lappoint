import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BettingCard from '@/components/BettingCard'
import AttendanceButton from '@/components/AttendanceButton'

interface PageProps {
  params: Promise<{ raceId: string }>
}

type SessionType = 'race' | 'qualifying' | 'sprint' | 'sprint_qualifying'

const SESSION_CONFIG: Record<SessionType, { label: string; icon: string; color: string }> = {
  sprint_qualifying: { label: '스프린트 예선', icon: 'SQ', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  qualifying:        { label: '예선 (Qualifying)', icon: 'Q',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  sprint:            { label: '스프린트 레이스',   icon: 'S',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  race:              { label: '결승 레이스',       icon: 'R',  color: 'text-red-700 bg-red-50 border-red-200' },
}

const SESSION_ORDER: SessionType[] = ['sprint_qualifying', 'qualifying', 'sprint', 'race']

export default async function PredictPage({ params }: PageProps) {
  const { raceId } = await params
  const supabase = await createClient()

  const { data: race } = await supabase
    .from('races')
    .select('id, name, race_date, status, qualifying_date, sprint_date, sprint_qualifying_date')
    .eq('id', raceId)
    .single()

  if (!race) notFound()

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, question, options, is_settled, correct_option, session_type')
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

  // 유저 배팅 내역
  const userBetMap = new Map<string, { selected_option: string; bet_amount: number }>()
  if (user && predictions && predictions.length > 0) {
    const predictionIds = predictions.map((p) => p.id)
    const { data: userBets } = await supabase
      .from('bets')
      .select('prediction_id, selected_option, bet_amount')
      .eq('user_id', user.id)
      .in('prediction_id', predictionIds)
    if (userBets) {
      for (const b of userBets) {
        userBetMap.set(b.prediction_id, { selected_option: b.selected_option, bet_amount: b.bet_amount })
      }
    }
  }

  // 세션별 예측 그룹핑
  const predsBySession = new Map<SessionType, typeof predictions>()
  if (predictions) {
    for (const p of predictions) {
      const sType = (p.session_type ?? 'race') as SessionType
      const list = predsBySession.get(sType) ?? []
      list.push(p)
      predsBySession.set(sType, list)
    }
  }

  const now = new Date()

  const sessionDates: Record<SessionType, string | null> = {
    sprint_qualifying: race.sprint_qualifying_date ?? null,
    qualifying:        race.qualifying_date ?? null,
    sprint:            race.sprint_date ?? null,
    race:              race.race_date,
  }

  // 세션 표시 조건: 날짜가 있거나 해당 세션에 예측 항목이 있는 경우 (race는 항상)
  const activeSessions = SESSION_ORDER.filter(
    (s) => s === 'race' || sessionDates[s] !== null || (predsBySession.get(s)?.length ?? 0) > 0
  )

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

      {/* 세션별 예측 항목 */}
      {predictions && predictions.length > 0 ? (
        <div className="space-y-6">
          {activeSessions.map((sessionType) => {
            const sessionPreds = predsBySession.get(sessionType) ?? []
            if (sessionPreds.length === 0) return null

            const cfg = SESSION_CONFIG[sessionType]
            const sessionDate = sessionDates[sessionType]
            const isLocked = sessionDate != null && new Date(sessionDate) <= now

            const sessionDateStr = sessionDate
              ? new Date(sessionDate).toLocaleDateString('ko-KR', {
                  month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
                })
              : null

            return (
              <section key={sessionType} className="space-y-3">
                {/* 세션 헤더 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {cfg.icon}
                  </span>
                  <h2 className="text-sm font-bold text-gray-800">{cfg.label}</h2>
                  {sessionDateStr && (
                    <span className="text-gray-400 text-xs">{sessionDateStr}</span>
                  )}
                  {isLocked && (
                    <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                      배팅 마감
                    </span>
                  )}
                </div>

                {/* 해당 세션 예측 카드들 */}
                <div className="space-y-3">
                  {sessionPreds.map((pred) => (
                    <BettingCard
                      key={pred.id}
                      prediction={{
                        id: pred.id,
                        question: pred.question,
                        options: pred.options as string[],
                        is_settled: pred.is_settled,
                        correct_option: pred.correct_option,
                      }}
                      userBalance={pointBalance}
                      isLoggedIn={!!user}
                      userBet={userBetMap.get(pred.id)}
                      isLocked={isLocked}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
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
