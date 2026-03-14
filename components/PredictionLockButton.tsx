'use client'

import { useTransition } from 'react'
import { togglePredictionManualLock } from '@/app/actions/adminLock'

interface PredictionLockButtonProps {
  predictionId: string
  manuallyLocked: boolean
  isAutoDeadline: boolean
}

export default function PredictionLockButton({
  predictionId,
  manuallyLocked,
  isAutoDeadline,
}: PredictionLockButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 마감 방식 배지 */}
      {isAutoDeadline ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
          자동마감
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
          수동마감
        </span>
      )}
      {manuallyLocked && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
          마감됨
        </span>
      )}
      {/* 수동 잠금/해제 버튼 */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => togglePredictionManualLock(predictionId, !manuallyLocked))}
        className={`text-xs font-medium px-2 py-0.5 rounded border transition-colors disabled:opacity-50
          ${manuallyLocked
            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
      >
        {isPending ? '...' : manuallyLocked ? '수동마감 해제' : '수동마감'}
      </button>
    </div>
  )
}
