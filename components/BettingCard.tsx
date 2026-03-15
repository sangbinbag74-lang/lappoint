'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { placeBet } from '@/app/actions/bet'
import { postBetComment } from '@/app/actions/comment'
import { getDriverColor, getConstructorColor } from '@/lib/constants/teamColors'
import { getDriverNameKo } from '@/lib/constants/driverNames'

interface Prediction {
  id: string
  question: string
  options: string[]
  is_settled: boolean
  correct_option: string | null
}

interface BettingCardProps {
  prediction: Prediction
  userBalance: number
  isLoggedIn: boolean
  userBet?: { selected_option: string; bet_amount: number }
  userBetId?: string
  isLocked?: boolean
  betStats?: Record<string, { count: number; total: number }>
  deadline?: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '보유 포인트가 부족합니다.',
  MIN_BET: '최소 배팅 금액은 10P입니다.',
  UNAUTHENTICATED: '로그인이 필요합니다.',
  USER_NOT_FOUND: '유저 정보를 찾을 수 없습니다.',
  NO_OPTION: '선택지를 먼저 골라주세요.',
  BETTING_LOCKED: '배팅이 마감되었습니다.',
  ALREADY_SETTLED: '이미 정산된 예측입니다.',
  PROFANITY: '비속어가 포함된 댓글은 작성할 수 없습니다.',
}

function formatTimeLeft(deadline: string): string | null {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  if (days > 0) return `${days}일 ${hours}시간 ${mins}분`
  if (hours > 0) return `${hours}시간 ${mins}분`
  if (mins > 0) return `${mins}분 ${secs}초`
  return `${secs}초`
}

function TimeLeft({ deadline }: { deadline: string }) {
  const [label, setLabel] = useState<string | null>(() => formatTimeLeft(deadline))

  useEffect(() => {
    const id = setInterval(() => setLabel(formatTimeLeft(deadline)), 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (!label) return null
  return <span className="text-gray-400 text-xs flex-shrink-0">⏱ {label}</span>
}

// 모듈 레벨 정의 — 내부 정의 시 매 렌더마다 새 컴포넌트 타입으로 인식되어 한글 IME 버그 발생
interface CommentInputProps {
  commentText: string
  setCommentText: (v: string) => void
  onSubmit: () => void
  onSkip: () => void
  isPending: boolean
  commentError?: string | null
}

function CommentInput({ commentText, setCommentText, onSubmit, onSkip, isPending, commentError }: CommentInputProps) {
  return (
    <div className="pt-2 border-t border-gray-100 space-y-2">
      <p className="text-xs text-gray-500 font-medium">의견 남기기 (선택)</p>
      {commentError && <p className="text-red-500 text-xs">{commentError}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={100}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSubmit() }}
          placeholder="한 줄 의견을 남겨보세요..."
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2
            focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
        />
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="text-xs font-bold px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          등록
        </button>
        <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 px-2">
          건너뛰기
        </button>
      </div>
    </div>
  )
}

export default function BettingCard({
  prediction,
  userBalance,
  isLoggedIn,
  userBet,
  userBetId,
  isLocked = false,
  betStats = {},
  deadline,
}: BettingCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCommentPending, startCommentTransition] = useTransition()

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [betAmountStr, setBetAmountStr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [newBetId, setNewBetId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentDone, setCommentDone] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const betAmount = parseInt(betAmountStr, 10)
  const isValidAmount = !isNaN(betAmount) && betAmount >= 10

  const totalBetAmount = Object.values(betStats).reduce((s, v) => s + v.total, 0)

  const triggerShake = (msg: string) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  const handleSubmit = () => {
    if (!isLoggedIn) { triggerShake(ERROR_MESSAGES.UNAUTHENTICATED); return }
    if (!selectedOption) { triggerShake(ERROR_MESSAGES.NO_OPTION); return }
    if (!isValidAmount) { triggerShake(ERROR_MESSAGES.MIN_BET); return }
    if (betAmount > userBalance) { triggerShake(ERROR_MESSAGES.INSUFFICIENT_BALANCE); return }
    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await placeBet(prediction.id, selectedOption, betAmount)
      if (!result.success) {
        triggerShake(ERROR_MESSAGES[result.error] ?? result.error)
        return
      }
      setSuccessMsg(`배팅 완료! 잔액: ${result.new_balance.toLocaleString()} P`)
      if ('bet_id' in result) setNewBetId((result as { bet_id?: string }).bet_id ?? null)
      setBetAmountStr('')
      router.refresh()
    })
  }

  const handleComment = () => {
    const trimmed = commentText.trim()
    const effectiveBetId = newBetId ?? userBetId
    if (!effectiveBetId || !trimmed) { setCommentDone(true); return }
    setCommentError(null)
    startCommentTransition(async () => {
      const result = await postBetComment(effectiveBetId, prediction.id, trimmed)
      if (!result.success) {
        setCommentError(ERROR_MESSAGES[result.error] ?? result.error)
        return
      }
      setCommentDone(true)
      router.refresh()
    })
  }

  // ── 정산 완료 ────────────────────────────────────────────
  if (prediction.is_settled && prediction.correct_option) {
    return (
      <div className="space-y-3">
        <h3 className="text-gray-900 font-bold text-sm leading-snug">{prediction.question}</h3>
        <div className="flex flex-col gap-1.5">
          {prediction.options.map((opt) => {
            const isCorrect = opt === prediction.correct_option
            const isUserPick = userBet?.selected_option === opt
            const color = getDriverColor(opt) ?? getConstructorColor(opt)
            const koName = getDriverNameKo(opt)
            const stat = betStats[opt]
            const pct = totalBetAmount > 0 && stat ? Math.round((stat.total / totalBetAmount) * 100) : null
            return (
              <div key={opt} className={`relative flex items-center gap-0 rounded-lg border overflow-hidden
                ${isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                {pct !== null && (
                  <div className="absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color ?? (isCorrect ? '#22c55e' : '#6b7280'), opacity: 0.13 }} />
                )}
                <span className="w-1 self-stretch flex-shrink-0 relative z-10" style={{ backgroundColor: color ?? (isCorrect ? '#22c55e' : '#e5e7eb') }} />
                <div className="flex items-center justify-between flex-1 px-3 py-2 relative z-10">
                  <span className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>
                    {isCorrect && '✓ '}{opt}
                    {koName && <span className="text-xs font-normal text-gray-400 ml-1">/ {koName}</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {isUserPick && <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">내 선택</span>}
                    {pct !== null && <span className="text-gray-500 text-xs font-bold tabular-nums">{pct}%</span>}
                    {stat && <span className="text-gray-400 text-xs tabular-nums">{stat.total.toLocaleString()}P</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {userBet && (
          <p className={`text-xs font-semibold ${userBet.selected_option === prediction.correct_option ? 'text-green-600' : 'text-red-500'}`}>
            {userBet.selected_option === prediction.correct_option
              ? `적중! ${userBet.bet_amount.toLocaleString()}P 배팅`
              : `실패. 정답: ${prediction.correct_option}`}
          </p>
        )}
      </div>
    )
  }

  // ── 마감 / 배팅 완료 ─────────────────────────────────────
  if (isLocked || userBet) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-gray-900 font-bold text-sm leading-snug">{prediction.question}</h3>
          {deadline && !isLocked && <TimeLeft deadline={deadline} />}
        </div>
        <div className="flex flex-col gap-1.5">
          {prediction.options.map((opt) => {
            const isUserPick = userBet?.selected_option === opt
            const color = getDriverColor(opt) ?? getConstructorColor(opt)
            const koName = getDriverNameKo(opt)
            const stat = betStats[opt]
            const pct = totalBetAmount > 0 && stat ? Math.round((stat.total / totalBetAmount) * 100) : null
            const showStats = !!userBet
            return (
              <div key={opt} className={`relative flex items-center gap-0 rounded-lg border overflow-hidden
                ${isUserPick ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                {showStats && pct !== null && (
                  <div className="absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color ?? '#6b7280', opacity: 0.13 }} />
                )}
                <span className="w-1 self-stretch flex-shrink-0 relative z-10" style={{ backgroundColor: color ?? '#e5e7eb' }} />
                <div className="flex items-center justify-between flex-1 px-3 py-2 relative z-10">
                  <span className={`text-sm font-semibold ${isUserPick ? 'text-blue-700' : 'text-gray-600'}`}>
                    {isUserPick && '✓ '}{opt}
                    {koName && <span className="text-xs font-normal text-gray-400 ml-1">/ {koName}</span>}
                  </span>
                  {showStats && (pct !== null || stat) && (
                    <div className="flex items-center gap-2 text-xs tabular-nums">
                      {pct !== null && <span className="text-gray-600 font-bold">{pct}%</span>}
                      {stat && <span className="text-gray-400">{stat.total.toLocaleString()}P</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {userBet && <p className="text-xs text-gray-500">{userBet.bet_amount.toLocaleString()}P 배팅 완료 — 결과 대기 중</p>}
        {isLocked && !userBet && <p className="text-xs text-orange-500 font-medium">세션이 시작되어 배팅이 마감되었습니다.</p>}
        {userBet && !commentDone && (
          <CommentInput
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmit={handleComment}
            onSkip={() => setCommentDone(true)}
            isPending={isCommentPending}
            commentError={commentError}
          />
        )}
      </div>
    )
  }

  // ── 배팅 가능 ────────────────────────────────────────────
  return (
    <div className={`space-y-3 transition-all ${shake ? 'animate-shake' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-gray-900 font-bold text-sm leading-snug">{prediction.question}</h3>
        {deadline && <TimeLeft deadline={deadline} />}
      </div>

      <div className="flex flex-col gap-1.5">
        {prediction.options.map((opt) => {
          const isSelected = selectedOption === opt
          const color = getDriverColor(opt) ?? getConstructorColor(opt)
          const koName = getDriverNameKo(opt)
          const stat = betStats[opt]
          const pct = totalBetAmount > 0 && stat ? Math.round((stat.total / totalBetAmount) * 100) : null
          const showStats = !!successMsg
          return (
            <button
              key={opt}
              onClick={() => { setSelectedOption(opt); setError(null); setSuccessMsg(null) }}
              disabled={isPending || !!successMsg}
              className={`relative flex items-center gap-0 rounded-lg border overflow-hidden text-left transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {showStats && pct !== null && (
                <div className="absolute inset-y-0 left-0 transition-[width] duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color ?? '#6b7280', opacity: 0.13 }} />
              )}
              <span className="w-1 self-stretch flex-shrink-0 relative z-10" style={{ backgroundColor: color ?? (isSelected ? '#3b82f6' : '#e5e7eb') }} />
              <div className="flex items-center justify-between flex-1 px-3 py-2.5 relative z-10">
                <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                  {isSelected && '✓ '}{opt}
                  {koName && <span className="text-xs font-normal text-gray-400 ml-1">/ {koName}</span>}
                </span>
                {showStats && (pct !== null || stat) && (
                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    {pct !== null && <span className="text-gray-600 font-bold">{pct}%</span>}
                    {stat && <span className="text-gray-400">{stat.total.toLocaleString()}P</span>}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={10}
          step={10}
          value={betAmountStr}
          onChange={(e) => { setBetAmountStr(e.target.value); setError(null); setSuccessMsg(null) }}
          disabled={isPending || !!successMsg}
          placeholder="배팅 포인트 입력 (최소 10P)"
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm
            placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-gray-400 text-xs whitespace-nowrap">
          보유 <span className="text-gray-700 font-semibold">{userBalance.toLocaleString()} P</span>
        </span>
      </div>
      <p className="text-gray-400 text-xs">* 정산 시 총 배팅액의 10%가 수수료로 차감됩니다.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg ? (
        <div className="space-y-2">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-green-700 text-sm font-medium">{successMsg}</p>
          </div>
          {!commentDone && (
            <CommentInput
              commentText={commentText}
              setCommentText={setCommentText}
              onSubmit={handleComment}
              onSkip={() => setCommentDone(true)}
              isPending={isCommentPending}
            />
          )}
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
            text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
        >
          {isPending ? '처리 중...' : '배팅하기'}
        </button>
      )}
    </div>
  )
}
