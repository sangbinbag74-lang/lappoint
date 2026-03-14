'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { postBetComment } from '@/app/actions/comment'
import type { BetComment } from '@/app/predict/[raceId]/page'

interface CommentPanelProps {
  question: string
  predictionId: string
  comments: BetComment[]
  userBetId?: string
  isLoggedIn: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return `${Math.floor(hrs / 24)}일 전`
}

export default function CommentPanel({
  question,
  predictionId,
  comments,
  userBetId,
  isLoggedIn,
}: CommentPanelProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!userBetId || !trimmed) return
    startTransition(async () => {
      await postBetComment(userBetId, predictionId, trimmed)
      setText('')
      setDone(true)
      router.refresh()
    })
  }

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors
          ${comments.length > 0
            ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-400 border-gray-200 bg-gray-50 hover:bg-gray-100'
          }`}
      >
        💬 {comments.length}
      </button>

      {open && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />

          {/* 사이드 패널 */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
            {/* 패널 헤더 */}
            <div className="flex items-start justify-between px-4 py-3.5 border-b border-gray-200 flex-shrink-0">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-gray-400 font-medium mb-0.5">의견 {comments.length}개</p>
                <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{question}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5"
              >
                ✕
              </button>
            </div>

            {/* 댓글 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">아직 의견이 없습니다.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <span className="text-sm flex-shrink-0 mt-0.5">👤</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">{c.users?.nickname ?? '익명'}</span>
                        {c.bets && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-blue-600 font-medium">{c.bets.selected_option}</span>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-gray-400">{c.bets.bet_amount.toLocaleString()}P</span>
                          </>
                        )}
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 댓글 입력 */}
            {isLoggedIn && userBetId && !done && (
              <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">의견 남기기</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={100}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSubmit() }}
                    placeholder="한 줄 의견..."
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2
                      focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || !text.trim()}
                    className="text-xs font-bold px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40"
                  >
                    등록
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
