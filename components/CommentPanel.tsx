'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editComment, deleteComment, toggleLike } from '@/app/actions/comment'
import type { BetComment } from '@/app/predict/[raceId]/page'

interface CommentPanelProps {
  question: string
  predictionId: string
  comments: BetComment[]
  currentUserId?: string
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

interface EditInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  isPending: boolean
}

function EditInput({ value, onChange, onSubmit, onCancel, isPending }: EditInputProps) {
  return (
    <div className="flex gap-1.5 mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSubmit() }}
        maxLength={100}
        autoFocus
        className="flex-1 bg-gray-50 border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
      />
      <button onClick={onSubmit} disabled={isPending} className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-1">저장</button>
      <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 px-1">취소</button>
    </div>
  )
}

export default function CommentPanel({
  question,
  comments,
  currentUserId,
  isLoggedIn,
}: CommentPanelProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleEditStart = (c: BetComment) => {
    setEditingId(c.id)
    setEditText(c.content)
  }

  const handleEditSubmit = (commentId: string) => {
    const trimmed = editText.trim()
    if (!trimmed) return
    startTransition(async () => {
      await editComment(commentId, trimmed)
      setEditingId(null)
      router.refresh()
    })
  }

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      await deleteComment(commentId)
      router.refresh()
    })
  }

  const handleLike = (commentId: string) => {
    if (!isLoggedIn) return
    startTransition(async () => {
      await toggleLike(commentId)
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
          {/* 배경 클릭으로 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* 플로팅 팝업 창 */}
          <div
            className="fixed right-4 top-16 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            {/* 팝업 헤더 */}
            <div className="flex items-start justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0 bg-gray-50">
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

            {/* 댓글 목록 — 최신순 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">아직 의견이 없습니다.</p>
              ) : (
                comments.map((c) => {
                  const isOwn = !!currentUserId && c.user_id === currentUserId
                  const isEditing = editingId === c.id

                  return (
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

                        {isEditing ? (
                          <EditInput
                            value={editText}
                            onChange={setEditText}
                            onSubmit={() => handleEditSubmit(c.id)}
                            onCancel={() => setEditingId(null)}
                            isPending={isPending}
                          />
                        ) : (
                          <>
                            <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() => handleLike(c.id)}
                                disabled={!isLoggedIn || isPending}
                                className={`flex items-center gap-1 text-xs transition-colors
                                  ${c.is_liked_by_me ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}
                                  disabled:cursor-not-allowed`}
                              >
                                ♥{c.likes_count > 0 && <span>{c.likes_count}</span>}
                              </button>
                              {isOwn && (
                                <>
                                  <button
                                    onClick={() => handleEditStart(c)}
                                    className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    disabled={isPending}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                  >
                                    삭제
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
