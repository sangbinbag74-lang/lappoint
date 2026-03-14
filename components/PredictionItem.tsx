'use client'

import { useState } from 'react'
import CommentChat from './CommentChat'
import type { BetComment } from '@/app/predict/[raceId]/page'

interface PredictionItemProps {
  question: string
  isSettled: boolean
  hasUserBet: boolean
  defaultOpen?: boolean
  predictionId: string
  comments: BetComment[]
  userBetId?: string
  currentUserId?: string
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function PredictionItem({
  question,
  isSettled,
  hasUserBet,
  defaultOpen = true,
  predictionId,
  comments,
  currentUserId,
  isLoggedIn,
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
          {isSettled && (
            <span className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
              정산
            </span>
          )}
          {hasUserBet && !isSettled && (
            <span className="flex-shrink-0 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
              배팅완료
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {comments.length > 0 && (
            <span className="text-xs text-blue-500 font-medium">💬 {comments.length}</span>
          )}
          <span className="text-gray-400 text-xs">{open ? '접기' : '펼치기'}</span>
        </div>
      </button>

      {open && (
        <div className="pb-4 px-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">{children}</div>
            <div className="sm:w-44 flex-shrink-0">
              <CommentChat
                comments={comments}
                predictionId={predictionId}
                currentUserId={currentUserId}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
