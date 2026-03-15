'use client'

import { useTransition } from 'react'
import { unsuspendCommentUser } from '@/app/actions/adminUsers'

export default function UnsuspendButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => unsuspendCommentUser(userId))}
      className="text-xs font-semibold text-green-700 border border-green-200 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap"
    >
      {isPending ? '처리중...' : '정지 해제'}
    </button>
  )
}
