'use client'

import { useState, useTransition, useEffect } from 'react'
import { settlePrediction, autoSettlePrediction } from '@/app/actions/settle'

interface Prediction {
  id: string
  question: string
  options: string[]
  is_settled: boolean
  correct_option: string | null
  prediction_type?: string
}

interface BetStats {
  total_bets: number
  total_amount: number
}

interface StoredResult {
  position: number
  driver_code: string
  driver_name: string
  constructor_name: string
}

interface SettleFormProps {
  prediction: Prediction
  stats: BetStats
  raceResults?: StoredResult[]
}

export default function SettleForm({ prediction, stats, raceResults }: SettleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const winner = raceResults?.find((r) => r.position === 1)
  const autoSuggestedOption = winner
    ? prediction.options.find((opt) => {
        const o = opt.trim().toLowerCase()
        const code = winner.driver_code.toLowerCase()
        const name = winner.driver_name.toLowerCase()
        return (
          o === code ||
          o === name ||
          name.includes(o) ||
          o.includes(name.split(' ')[1] ?? '')
        )
      })
    : undefined

  useEffect(() => {
    if (autoSuggestedOption && !selectedOption) {
      setSelectedOption(autoSuggestedOption)
    }
  }, [autoSuggestedOption])

  if (prediction.is_settled) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">{prediction.question}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">정산 완료 →</span>
          <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {prediction.correct_option}
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          참여 {stats.total_bets}명 · 총 {stats.total_amount.toLocaleString()}P
        </div>
      </div>
    )
  }

  const handleSettle = (option: string) => {
    if (!option) {
      setResult({ type: 'error', message: '정답 선택지를 선택해주세요.' })
      return
    }
    const confirmed = window.confirm(
      `⚠️ 정산 확인\n\n예측: "${prediction.question}"\n정답: "${option}"\n\n총 배팅 풀: ${stats.total_amount.toLocaleString()}P (참여 ${stats.total_bets}명)\n\n정말로 정산하시겠습니까? 되돌릴 수 없습니다.`
    )
    if (!confirmed) return

    setResult(null)
    startTransition(async () => {
      const res = await settlePrediction(prediction.id, option)
      if (!res.success) {
        setResult({
          type: 'error',
          message: res.error === 'ALREADY_SETTLED' ? '이미 정산된 항목입니다.' : `오류: ${res.error}`,
        })
        return
      }
      setResult({
        type: 'success',
        message:
          res.winner_count === 0
            ? `정산 완료. 정답자 없음 — ${res.net_pool.toLocaleString()}P 귀속`
            : `정산 완료! 당첨자 ${res.winner_count}명에게 총 ${res.distributed.toLocaleString()}P 지급`,
      })
    })
  }

  const handleAutoSettle = () => {
    const confirmed = window.confirm(
      `🤖 자동 정산\n\n예측: "${prediction.question}"\n\n레이스 결과와 자동 매핑하여 정산합니다.\n계속하시겠습니까?`
    )
    if (!confirmed) return

    setResult(null)
    startTransition(async () => {
      const res = await autoSettlePrediction(prediction.id)
      if (!res.success) {
        setResult({ type: 'error', message: `자동 정산 실패: ${res.error}` })
        return
      }
      const sr = res.settle_result
      if (!sr.success) {
        setResult({ type: 'error', message: `정산 오류: ${sr.error}` })
        return
      }
      setResult({
        type: 'success',
        message: `자동 정산 완료! 정답: ${res.matched_option} · 당첨자 ${sr.winner_count}명 · ${sr.distributed.toLocaleString()}P 지급`,
      })
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{prediction.question}</p>
          {prediction.prediction_type === 'race_winner' && (
            <span className="text-xs text-blue-600 font-medium">자동정산 가능</span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {stats.total_bets}명 · {stats.total_amount.toLocaleString()}P
        </span>
      </div>

      {/* 레이스 결과 미리보기 */}
      {raceResults && raceResults.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1.5">실제 결과</p>
          {raceResults.slice(0, 5).map((r) => (
            <div key={r.position} className="flex items-center gap-2 text-xs">
              <span className={`w-4 font-black ${r.position === 1 ? 'text-yellow-500' : r.position === 2 ? 'text-gray-400' : r.position === 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                {r.position}
              </span>
              <span className="text-gray-900 font-medium w-8">{r.driver_code}</span>
              <span className="text-gray-600">{r.driver_name}</span>
              <span className="text-gray-400 ml-auto">{r.constructor_name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 정답 선택지 */}
      <div className="flex flex-wrap gap-2">
        {prediction.options.map((opt) => {
          const isAutoMatch = opt === autoSuggestedOption
          return (
            <button
              key={opt}
              onClick={() => setSelectedOption(opt)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                ${selectedOption === opt
                  ? isAutoMatch
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-900 border-gray-900 text-white'
                  : isAutoMatch
                    ? 'bg-blue-50 border-blue-300 text-blue-700 hover:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAutoMatch && '★ '}{opt}
            </button>
          )
        })}
      </div>

      {autoSuggestedOption && (
        <p className="text-blue-600 text-xs">
          ★ 결과 매핑: {winner?.driver_name} ({winner?.driver_code})
        </p>
      )}

      {result && (
        <p className={`text-xs font-medium ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleSettle(selectedOption)}
          disabled={isPending || !selectedOption}
          className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100
            disabled:text-gray-300 disabled:cursor-not-allowed
            text-white text-xs font-bold py-2 rounded-lg transition-all"
        >
          {isPending ? '처리 중...' : '결과 확정 및 정산'}
        </button>

        {prediction.prediction_type === 'race_winner' && raceResults && raceResults.length > 0 && (
          <button
            onClick={handleAutoSettle}
            disabled={isPending}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
              text-white text-xs font-bold rounded-lg transition-all whitespace-nowrap"
          >
            자동 정산
          </button>
        )}
      </div>
    </div>
  )
}
