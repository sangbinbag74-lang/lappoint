'use client'

import { useState } from 'react'

interface PredictionItemProps {
  question: string
  isSettled: boolean
  hasUserBet: boolean
  voterCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function PredictionItem({
  question,
  isSettled,
  hasUserBet,
  voterCount,
  defaultOpen = true,
  children,
}: PredictionItemProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 text-xs w-3 flex-shrink-0">{open ? '▼' : '▶'}</span>
          <span className="text-gray-800 font-semibold text-sm truncate">{question}</span>
          {voterCount != null && voterCount > 0 && (
            <span className="flex-shrink-0 text-gray-400 text-xs">{voterCount}명 투표</span>
          )}
          {isSettled && (
            <span className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
              정산
            </span>
          )}
          {hasUserBet && !isSettled && (
            <span className="flex-shrink-0 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
              참여완료
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs flex-shrink-0 ml-2">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && <div className="pb-4 px-4">{children}</div>}
    </div>
  )
}
