'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editComment, deleteComment, toggleLike } from '@/app/actions/comment'
import type { BetComment } from '@/app/predict/[raceId]/page'

export type LiveChatComment = BetComment & { prediction_question: string }

interface LiveChatProps {
  allComments: LiveChatComment[]
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
    <div className="flex gap-1 mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSubmit() }}
        maxLength={100}
        autoFocus
        className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none"
      />
      <button onClick={onSubmit} disabled={isPending} className="text-xs font-semibold text-blue-600 px-1">저장</button>
      <button onClick={onCancel} className="text-xs text-gray-400 px-1">취소</button>
    </div>
  )
}

export default function LiveChat({ allComments, currentUserId, isLoggedIn }: LiveChatProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEditStart = (c: LiveChatComment) => {
    setEditingId(c.id)
    setEditText(c.content)
    setEditError(null)
  }

  const handleEditSubmit = (commentId: string) => {
    const trimmed = editText.trim()
    if (!trimmed) return
    setEditError(null)
    startTransition(async () => {
      const result = await editComment(commentId, trimmed)
      if (!result.success) {
        if (result.error === 'PROFANITY') {
          setEditError('비속어가 포함된 댓글은 작성할 수 없습니다.')
        }
        return
      }
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
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-h-[70vh] lg:h-[calc(100vh-80px)] lg:max-h-none">
      {/* 헤더 */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-bold text-gray-600">💬 라이브 채팅 <span className="text-gray-400 font-normal">{allComments.length}</span></p>
      </div>

      {/* 댓글 목록 — 최신순 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {allComments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">아직 의견이 없습니다</p>
        ) : (
          allComments.map((c) => {
            const isOwn = !!currentUserId && c.user_id === currentUserId
            const isEditing = editingId === c.id

            return (
              <div key={c.id} className="text-xs border-b border-gray-50 pb-2.5 last:border-0">
                {/* 예측 문항 */}
                <p className="text-gray-400 text-xs leading-tight truncate mb-0.5">{c.prediction_question}</p>

                {/* 닉네임 + 선택지 + 시간 */}
                <div className="flex items-center gap-1 flex-wrap mb-0.5">
                  <span className="font-semibold text-gray-800">{c.users?.nickname ?? '익명'}</span>
                  {c.bets && (
                    <span className="text-blue-600 font-medium">[{c.bets.selected_option}]</span>
                  )}
                  <span className="text-gray-400 text-xs ml-auto">{timeAgo(c.created_at)}</span>
                </div>

                {/* 내용 or 수정 입력 */}
                {isEditing ? (
                  <>
                    <EditInput
                      value={editText}
                      onChange={setEditText}
                      onSubmit={() => handleEditSubmit(c.id)}
                      onCancel={() => setEditingId(null)}
                      isPending={isPending}
                    />
                    {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 leading-snug">{c.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleLike(c.id)}
                        disabled={!isLoggedIn || isPending}
                        className={`flex items-center gap-0.5 transition-colors disabled:cursor-not-allowed
                          ${c.is_liked_by_me ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                      >
                        ♥{c.likes_count > 0 && <span className="text-gray-400 ml-0.5">{c.likes_count}</span>}
                      </button>
                      {isOwn && (
                        <>
                          <button onClick={() => handleEditStart(c)} className="text-gray-300 hover:text-blue-500 transition-colors">수정</button>
                          <button onClick={() => handleDelete(c.id)} disabled={isPending} className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">삭제</button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
