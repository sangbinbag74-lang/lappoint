import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BettingCard from '@/components/BettingCard'
import AttendanceButton from '@/components/AttendanceButton'
import PredictionSection from '@/components/PredictionSection'
import PredictionItem from '@/components/PredictionItem'

interface PageProps {
  params: Promise<{ raceId: string }>
}

type SessionType = 'race' | 'qualifying' | 'sprint' | 'sprint_qualifying'

const SESSION_CONFIG: Record<SessionType, { label: string; icon: string; color: string }> = {
  sprint_qualifying: { label: '스프린트 예선', icon: 'SQ', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  sprint:            { label: '스프린트 레이스', icon: 'S', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  qualifying:        { label: '예선 (Qualifying)', icon: 'Q', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  race:              { label: '결승 레이스', icon: 'R', color: 'text-red-700 bg-red-50 border-red-200' },
}

// 세션 표시 순서: 스프린트예선 → 스프린트 → 예선 → 결승
const SESSION_ORDER: SessionType[] = ['sprint_qualifying', 'sprint', 'qualifying', 'race']

// 세션 내 예측 항목 정렬 우선순위
const TYPE_PRIORITY: Record<string, number> = {
  pole_position: 0,
  qualifying_duel: 2,
  race_winner: 10,
  race_constructor: 11,
  fastest_lap: 12,
  podium_yn: 20,
  custom: 30,
  finisher_count: 40,
}

export interface BetComment {
  id: string
  content: string
  created_at: string
  prediction_id: string
  bet_id: string
  user_id: string
  users: { nickname: string; avatar_url: string | null } | null
  bets: { selected_option: string; bet_amount: number } | null
  likes_count: number
  is_liked_by_me: boolean
}

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
    .select('id, question, options, is_settled, correct_option, session_type, prediction_type, sort_order')
    .eq('race_id', raceId)
    .order('sort_order', { ascending: true })
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

  const predictionIds = predictions?.map((p) => p.id) ?? []

  // 유저 배팅 내역
  const userBetMap = new Map<string, { selected_option: string; bet_amount: number; bet_id: string }>()
  if (user && predictionIds.length > 0) {
    const { data: userBets } = await supabase
      .from('bets')
      .select('id, prediction_id, selected_option, bet_amount')
      .eq('user_id', user.id)
      .in('prediction_id', predictionIds)
    if (userBets) {
      for (const b of userBets) {
        userBetMap.set(b.prediction_id, { selected_option: b.selected_option, bet_amount: b.bet_amount, bet_id: b.id })
      }
    }
  }

  // 배팅 분포 집계 (전체 유저)
  type BetStat = { count: number; total: number }
  const betStatsMap = new Map<string, Record<string, BetStat>>()
  if (predictionIds.length > 0) {
    const { data: allBets } = await supabase
      .from('bets')
      .select('prediction_id, selected_option, bet_amount')
      .in('prediction_id', predictionIds)
    if (allBets) {
      for (const b of allBets) {
        const predStats = betStatsMap.get(b.prediction_id) ?? {}
        const cur = predStats[b.selected_option] ?? { count: 0, total: 0 }
        predStats[b.selected_option] = { count: cur.count + 1, total: cur.total + b.bet_amount }
        betStatsMap.set(b.prediction_id, predStats)
      }
    }
  }

  // 댓글 로드
  const commentsMap = new Map<string, BetComment[]>()
  if (predictionIds.length > 0) {
    const { data: comments } = await supabase
      .from('bet_comments')
      .select('id, content, created_at, prediction_id, bet_id, user_id, users(nickname, avatar_url), bets(selected_option, bet_amount)')
      .in('prediction_id', predictionIds)
      .order('created_at', { ascending: false })
      .limit(100)
    if (comments) {
      for (const c of comments) {
        const list = commentsMap.get(c.prediction_id) ?? []
        list.push(c as unknown as BetComment)
        commentsMap.set(c.prediction_id, list)
      }
    }
  }

  // 댓글 좋아요 로드
  const commentIds: string[] = []
  for (const list of Array.from(commentsMap.values())) {
    for (const c of list) commentIds.push(c.id)
  }
  if (commentIds.length > 0) {
    const { data: allLikes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds)
    if (allLikes) {
      const likesCountMap = new Map<string, number>()
      const userLikedSet = new Set<string>()
      for (const l of allLikes) {
        likesCountMap.set(l.comment_id, (likesCountMap.get(l.comment_id) ?? 0) + 1)
        if (user && l.user_id === user.id) userLikedSet.add(l.comment_id)
      }
      for (const [predId, list] of Array.from(commentsMap.entries())) {
        commentsMap.set(predId, list.map((c) => ({
          ...c,
          likes_count: likesCountMap.get(c.id) ?? 0,
          is_liked_by_me: userLikedSet.has(c.id),
        })))
      }
    } else {
      // No likes yet — set defaults
      for (const [predId, list] of Array.from(commentsMap.entries())) {
        commentsMap.set(predId, list.map((c) => ({ ...c, likes_count: 0, is_liked_by_me: false })))
      }
    }
  }

  // 세션별 예측 그룹핑 + 정렬
  const predsBySession = new Map<SessionType, typeof predictions>()
  if (predictions) {
    for (const p of predictions) {
      const sType = (p.session_type ?? 'race') as SessionType
      const list = predsBySession.get(sType) ?? []
      list.push(p)
      predsBySession.set(sType, list)
    }
    // 세션 내 prediction_type 우선순위 정렬
    for (const st of Array.from(predsBySession.keys())) {
      const preds = predsBySession.get(st)
      preds!.sort((a, b) => {
        const aPrio = TYPE_PRIORITY[a.prediction_type ?? 'custom'] ?? 30
        const bPrio = TYPE_PRIORITY[b.prediction_type ?? 'custom'] ?? 30
        return aPrio - bPrio
      })
      predsBySession.set(st, preds ?? null)
    }
  }

  const now = new Date()

  const sessionDates: Record<SessionType, string | null> = {
    sprint_qualifying: race.sprint_qualifying_date ?? null,
    sprint:            race.sprint_date ?? null,
    qualifying:        race.qualifying_date ?? null,
    race:              race.race_date,
  }

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
        <div className="space-y-4">
          {activeSessions.map((sessionType) => {
            const sessionPreds = predsBySession.get(sessionType) ?? []
            if (sessionPreds.length === 0) return null

            const cfg = SESSION_CONFIG[sessionType]
            const sessionDate = sessionDates[sessionType]
            const isLocked = sessionDate != null && new Date(sessionDate) <= now
            const defaultOpen = !isLocked

            return (
              <PredictionSection
                key={sessionType}
                title={`${cfg.label} (${sessionPreds.length})`}
                date={sessionDate}
                isLocked={isLocked}
                defaultOpen={defaultOpen}
                icon={cfg.icon}
                iconColor={cfg.color}
              >
                {sessionPreds.map((pred) => {
                  const userBet = userBetMap.get(pred.id)
                  return (
                    <PredictionItem
                      key={pred.id}
                      question={pred.question}
                      isSettled={pred.is_settled}
                      hasUserBet={!!userBet}
                      defaultOpen={!!userBet}
                      predictionId={pred.id}
                      comments={commentsMap.get(pred.id) ?? []}
                      userBetId={userBet?.bet_id}
                      currentUserId={user?.id}
                      isLoggedIn={!!user}
                    >
                      <BettingCard
                        prediction={{
                          id: pred.id,
                          question: pred.question,
                          options: pred.options as string[],
                          is_settled: pred.is_settled,
                          correct_option: pred.correct_option,
                        }}
                        userBalance={pointBalance}
                        isLoggedIn={!!user}
                        userBet={userBet ? { selected_option: userBet.selected_option, bet_amount: userBet.bet_amount } : undefined}
                        isLocked={isLocked}
                        betStats={betStatsMap.get(pred.id) ?? {}}
                        deadline={sessionDate}
                        userBetId={userBet?.bet_id}
                      />
                    </PredictionItem>
                  )
                })}
              </PredictionSection>
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
