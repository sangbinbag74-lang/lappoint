'use client'

import { useState, useTransition } from 'react'
import { settlePrediction } from '@/app/actions/settle'

interface Prediction {
  id: string
  question: string
  options: string[]
  is_settled: boolean
  correct_option: string | null
}

interface BetStats {
  total_bets: number
  total_amount: number
}

interface SettleFormProps {
  prediction: Prediction
  stats: BetStats
}

export default function SettleForm({ prediction, stats }: SettleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // 이미 정산 완료된 경우
  if (prediction.is_settled) {
    return (
      <div className="rounded-md border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm font-semibold text-slate-300 mb-2">{prediction.question}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">정산 완료 →</span>
          <span className="bg-emerald-900/50 border border-emerald-700 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded">
            {prediction.correct_option}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          참여 {stats.total_bets}명 · 총 {stats.total_amount.toLocaleString()}P
        </div>
      </div>
    )
  }

  const handleSettle = () => {
    if (!selectedOption) {
      setResult({ type: 'error', message: '정답 선택지를 선택해주세요.' })
      return
    }

    const confirmed = window.confirm(
      `⚠️ 정산 확인\n\n` +
      `예측: "${prediction.question}"\n` +
      `정답: "${selectedOption}"\n\n` +
      `총 배팅 풀: ${stats.total_amount.toLocaleString()}P (참여 ${stats.total_bets}명)\n\n` +
      `정말로 이 결과로 정산하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    )

    if (!confirmed) return

    setResult(null)
    startTransition(async () => {
      const res = await settlePrediction(prediction.id, selectedOption)
      if (!res.success) {
        setResult({
          type: 'error',
          message:
            res.error === 'ALREADY_SETTLED'
              ? '이미 정산된 예측 항목입니다.'
              : `오류: ${res.error}`,
        })
        return
      }
      setResult({
        type: 'success',
        message:
          res.winner_count === 0
            ? `정산 완료. 정답자 없음 — ${res.net_pool.toLocaleString()}P 플랫폼 귀속`
            : `정산 완료! 당첨자 ${res.winner_count}명에게 총 ${res.distributed.toLocaleString()}P 지급`,
      })
    })
  }

  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">{prediction.question}</p>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {stats.total_bets}명 · {stats.total_amount.toLocaleString()}P
        </span>
      </div>

      {/* 정답 선택지 선택 */}
      <div className="flex flex-wrap gap-2">
        {prediction.options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelectedOption(opt)}
            disabled={isPending}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-all
              ${
                selectedOption === opt
                  ? 'bg-slate-600 border-slate-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* 결과 메시지 */}
      {result && (
        <p
          className={`text-xs font-medium ${
            result.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {result.message}
        </p>
      )}

      {/* 정산 버튼 */}
      <button
        onClick={handleSettle}
        disabled={isPending || !selectedOption}
        className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800
          disabled:text-slate-600 disabled:cursor-not-allowed
          text-slate-200 text-xs font-bold py-2 rounded border border-slate-600
          hover:border-slate-500 transition-all"
      >
        {isPending ? '정산 처리 중...' : '결과 확정 및 포인트 정산'}
      </button>
    </div>
  )
}
