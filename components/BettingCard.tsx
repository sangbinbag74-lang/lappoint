'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeBet } from '@/app/actions/bet'

interface Prediction {
  id: string
  question: string
  options: string[]
}

interface BettingCardProps {
  prediction: Prediction
  userBalance: number
  isLoggedIn: boolean
}

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '보유 포인트가 부족합니다.',
  MIN_BET: '최소 배팅 금액은 10P입니다.',
  UNAUTHENTICATED: '로그인이 필요합니다.',
  USER_NOT_FOUND: '유저 정보를 찾을 수 없습니다.',
  NO_OPTION: '선택지를 먼저 골라주세요.',
}

export default function BettingCard({
  prediction,
  userBalance,
  isLoggedIn,
}: BettingCardProps) {
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
    if (!isLoggedIn) {
      triggerShake(ERROR_MESSAGES.UNAUTHENTICATED)
      return
    }
    if (!selectedOption) {
      triggerShake(ERROR_MESSAGES.NO_OPTION)
      return
    }
    if (!isValidAmount) {
      triggerShake(ERROR_MESSAGES.MIN_BET)
      return
    }
    if (betAmount > userBalance) {
      triggerShake(ERROR_MESSAGES.INSUFFICIENT_BALANCE)
      return
    }

    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const result = await placeBet(prediction.id, selectedOption, betAmount)
      if (!result.success) {
        triggerShake(ERROR_MESSAGES[result.error] ?? result.error)
        return
      }
      setSuccessMsg(
        `배팅 완료! 새 잔액: ${result.new_balance.toLocaleString()} P`
      )
      setBetAmountStr('')
      setSelectedOption(null)
      router.refresh()
    })
  }

  return (
    <div
      className={`bg-gray-900 border rounded-md p-6 space-y-5 transition-all
        ${shake ? 'animate-shake border-red-500' : 'border-gray-800'}
        ${successMsg ? 'border-green-600' : ''}
      `}
    >
      {/* 질문 */}
      <h3 className="text-white font-bold text-base leading-snug">
        {prediction.question}
      </h3>

      {/* 선택지 버튼 */}
      <div className="flex flex-wrap gap-2">
        {prediction.options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setSelectedOption(opt)
              setError(null)
              setSuccessMsg(null)
            }}
            disabled={isPending || !!successMsg}
            className={`px-4 py-2 rounded-md text-sm font-semibold border transition-all
              ${
                selectedOption === opt
                  ? 'border-[#FF2800] bg-[#FF2800]/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* 배팅 금액 입력 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min={10}
              step={10}
              value={betAmountStr}
              onChange={(e) => {
                setBetAmountStr(e.target.value)
                setError(null)
                setSuccessMsg(null)
              }}
              disabled={isPending || !!successMsg}
              placeholder="배팅 포인트 입력 (최소 10P)"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2.5 text-white text-sm
                placeholder-gray-500 focus:outline-none focus:border-[#FF2800] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <span className="text-gray-500 text-sm whitespace-nowrap">
            보유: <span className="text-white font-medium">{userBalance.toLocaleString()} P</span>
          </span>
        </div>

        {/* 수수료 미리보기 */}
        {isValidAmount && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>수수료 <span className="text-[#FF2800]">{fee.toLocaleString()} P</span></span>
            <span>·</span>
            <span>실제 배팅 <span className="text-white">{netBet.toLocaleString()} P</span></span>
          </div>
        )}

        <p className="text-gray-600 text-xs">
          * 배팅 금액의 10%는 시스템 수수료로 차감됩니다.
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-red-400 text-sm font-medium">{error}</p>
      )}

      {/* 성공 메시지 */}
      {successMsg && (
        <p className="text-green-400 text-sm font-medium">{successMsg}</p>
      )}

      {/* 배팅 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !!successMsg}
        className="w-full bg-[#FF2800] hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed
          text-white font-bold py-3 rounded-md text-sm transition-colors"
      >
        {isPending ? '처리 중...' : successMsg ? '배팅 완료' : '배팅하기'}
      </button>
    </div>
  )
}
