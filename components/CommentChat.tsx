'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editComment, deleteComment, toggleLike } from '@/app/actions/comment'
import type { BetComment } from '@/app/predict/[raceId]/page'

interface CommentChatProps {
  comments: BetComment[]
  predictionId: string
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
    <div className="flex gap-1 mt-0.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSubmit() }}
        maxLength={100}
        className="flex-1 bg-white border border-blue-300 rounded px-2 py-0.5 text-xs focus:outline-none"
        autoFocus
      />
      <button onClick={onSubmit} disabled={isPending} className="text-blue-600 font-semibold text-xs">저장</button>
      <button onClick={onCancel} className="text-gray-400 text-xs">취소</button>
    </div>
  )
}

export default function CommentChat({
  comments,
  currentUserId,
  isLoggedIn,
}: CommentChatProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isPending, startTransition] = useTransition()

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
    <div className="flex flex-col border border-gray-200 rounded-lg bg-gray-50 overflow-hidden h-48">
      {/* 헤더 */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold text-gray-500">💬 의견 {comments.length}</p>
      </div>

      {/* 댓글 목록 — 최신순 (DB에서 이미 desc 정렬) */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">아직 의견이 없습니다</p>
        ) : (
          comments.map((c) => {
            const isOwn = !!currentUserId && c.user_id === currentUserId
            const isEditing = editingId === c.id

            return (
              <div key={c.id} className="text-xs">
                <div className="flex items-center gap-1 flex-wrap leading-tight">
                  <span className="font-semibold text-gray-700">{c.users?.nickname ?? '익명'}</span>
                  {c.bets && (
                    <span className="text-blue-600 font-medium">[{c.bets.selected_option}]</span>
                  )}
                  <span className="text-gray-400">{timeAgo(c.created_at)}</span>
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
                  <div className="flex items-start gap-1 mt-0.5">
                    <span className="text-gray-700 flex-1 leading-snug break-all">{c.content}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleLike(c.id)}
                        disabled={!isLoggedIn || isPending}
                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors
                          ${c.is_liked_by_me
                            ? 'text-red-500'
                            : 'text-gray-300 hover:text-red-400'
                          } disabled:cursor-not-allowed`}
                      >
                        ♥<span className="text-gray-400">{c.likes_count > 0 ? c.likes_count : ''}</span>
                      </button>
                      {isOwn && (
                        <>
                          <button
                            onClick={() => handleEditStart(c)}
                            className="text-gray-300 hover:text-blue-500 px-0.5 transition-colors"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={isPending}
                            className="text-gray-300 hover:text-red-500 px-0.5 transition-colors disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
