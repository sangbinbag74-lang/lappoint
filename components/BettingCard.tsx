'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeBet } from '@/app/actions/bet'

interface Prediction {
  id: string
  question: string
  options: string[]
  is_settled: boolean
  correct_option: string | null
}

interface UserBet {
  selected_option: string
  bet_amount: number
}

interface BettingCardProps {
  prediction: Prediction
  userBalance: number
  isLoggedIn: boolean
  userBet?: UserBet
}

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '보유 포인트가 부족합니다.',
  MIN_BET: '최소 배팅 금액은 10P입니다.',
  UNAUTHENTICATED: '로그인이 필요합니다.',
  USER_NOT_FOUND: '유저 정보를 찾을 수 없습니다.',
  NO_OPTION: '선택지를 먼저 골라주세요.',
}

export default function BettingCard({ prediction, userBalance, isLoggedIn, userBet }: BettingCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [betAmountStr, setBetAmountStr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const betAmount = parseInt(betAmountStr, 10)
  const isValidAmount = !isNaN(betAmount) && betAmount >= 10
  const fee = isValidAmount ? Math.floor(betAmount * 0.1) : 0
  const netBet = isValidAmount ? betAmount - fee : 0

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
      setBetAmountStr('')
      setSelectedOption(null)
      router.refresh()
    })
  }

  // ── 정산 완료 상태 ───────────────────────────────────────────
  if (prediction.is_settled && prediction.correct_option) {
    const isWin = userBet?.selected_option === prediction.correct_option

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-gray-900 font-bold text-sm leading-snug">{prediction.question}</h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap text-gray-400 bg-gray-100 border-gray-200">
            정산 완료
          </span>
        </div>

        {/* 선택지 결과 */}
        <div className="flex flex-wrap gap-2">
          {prediction.options.map((opt) => {
            const isCorrect = opt === prediction.correct_option
            const isMyBet = userBet?.selected_option === opt
            return (
              <div
                key={opt}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-1.5
                  ${isCorrect
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-100 bg-gray-50 text-gray-400'
                  }`}
              >
                {isCorrect && <span>✓</span>}
                {opt}
                {isMyBet && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                    내 선택
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* 내 결과 배너 */}
        {userBet && (
          <div className={`rounded-lg px-3 py-2.5 text-sm font-medium ${isWin ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {isWin
              ? `적중! ${userBet.bet_amount.toLocaleString()}P 배팅 — 배당 지급 완료`
              : `실패. 정답: ${prediction.correct_option}`}
          </div>
        )}
      </div>
    )
  }

  // ── 배팅 가능 상태 ───────────────────────────────────────────
  return (
    <div
      className={`bg-white border rounded-xl p-5 space-y-4 shadow-sm transition-all
        ${shake ? 'animate-shake border-red-400' : successMsg ? 'border-green-400' : 'border-gray-200'}
      `}
    >
      <h3 className="text-gray-900 font-bold text-sm leading-snug">{prediction.question}</h3>

      <div className="flex flex-wrap gap-2">
        {prediction.options.map((opt) => (
          <button
            key={opt}
            onClick={() => { setSelectedOption(opt); setError(null); setSuccessMsg(null) }}
            disabled={isPending || !!successMsg}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all
              ${selectedOption === opt
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {selectedOption === opt && <span className="mr-1">✓</span>}{opt}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min={10}
              step={10}
              value={betAmountStr}
              onChange={(e) => { setBetAmountStr(e.target.value); setError(null); setSuccessMsg(null) }}
              disabled={isPending || !!successMsg}
              placeholder="배팅 포인트 입력 (최소 10P)"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm
                placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <span className="text-gray-400 text-xs whitespace-nowrap">
            보유 <span className="text-gray-700 font-semibold">{userBalance.toLocaleString()} P</span>
          </span>
        </div>

        {isValidAmount && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>수수료 <span className="text-orange-500 font-medium">{fee.toLocaleString()} P</span></span>
            <span className="text-gray-300">·</span>
            <span>실제 배팅 <span className="text-gray-700 font-medium">{netBet.toLocaleString()} P</span></span>
          </div>
        )}

        <p className="text-gray-400 text-xs">* 배팅 금액의 10%는 시스템 수수료로 차감됩니다.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <p className="text-green-700 text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || !!successMsg}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
          text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
      >
        {isPending ? '처리 중...' : successMsg ? '배팅 완료' : '배팅하기'}
      </button>
    </div>
  )
}
