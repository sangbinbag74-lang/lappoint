'use client'

import { useState, useTransition } from 'react'
import { suspendCommentUser } from '@/app/actions/adminUsers'

const DURATIONS = [
  { label: '1일', value: 1 },
  { label: '3일', value: 3 },
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
  { label: '180일', value: 180 },
  { label: '360일', value: 360 },
  { label: '영구정지', value: -1 },
]

export default function SuspendCommentUserButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(7)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-yellow-700 border border-yellow-200 bg-yellow-50 px-2 py-1 rounded-lg hover:bg-yellow-100 transition-colors whitespace-nowrap"
      >
        계정 정지
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-yellow-50 border border-yellow-200 rounded-lg w-52">
      <select
        value={duration}
        onChange={e => setDuration(Number(e.target.value))}
        className="text-xs border border-yellow-200 rounded px-1.5 py-1 bg-white"
      >
        {DURATIONS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="정지 사유 (필수)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        maxLength={100}
        className="text-xs border border-yellow-200 rounded px-1.5 py-1 bg-white"
      />
      <div className="flex gap-1">
        <button
          disabled={isPending || !reason.trim()}
          onClick={() => startTransition(async () => {
            await suspendCommentUser(userId, duration, reason.trim())
            setOpen(false)
            setReason('')
          })}
          className="flex-1 text-xs font-semibold text-yellow-700 border border-yellow-300 bg-yellow-100 px-2 py-1 rounded-lg hover:bg-yellow-200 disabled:opacity-50 transition-colors"
        >
          {isPending ? '처리중...' : '정지 적용'}
        </button>
        <button
          onClick={() => { setOpen(false); setReason('') }}
          className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  )
}
