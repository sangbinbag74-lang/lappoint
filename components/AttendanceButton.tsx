'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { checkAttendance } from '@/app/actions/attendance'

export default function AttendanceButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleAttendance = () => {
    startTransition(async () => {
      const result = await checkAttendance()
      if (result.success) {
        setMessage({ text: `+100P 출석 보상 지급!`, type: 'success' })
        router.refresh()
      } else if (result.error === 'ALREADY_CHECKED') {
        setMessage({ text: '오늘 출석 완료', type: 'info' })
      } else {
        setMessage({ text: '오류가 발생했습니다.', type: 'error' })
      }
    })
  }

  if (message) {
    return (
      <span
        className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${
          message.type === 'success'
            ? 'text-green-400 bg-green-400/10 border-green-400/30'
            : message.type === 'info'
            ? 'text-gray-400 bg-gray-800 border-gray-700'
            : 'text-red-400 bg-red-400/10 border-red-400/30'
        }`}
      >
        {message.text}
      </span>
    )
  }

  return (
    <button
      onClick={handleAttendance}
      disabled={isPending}
      className="text-xs font-bold px-3 py-1.5 rounded-md border border-[#FF2800]/50 text-[#FF2800]
        hover:bg-[#FF2800]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? '처리 중...' : '출석 체크 +100P'}
    </button>
  )
}
