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
        className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
          message.type === 'success'
            ? 'text-green-700 bg-green-50 border-green-200'
            : message.type === 'info'
            ? 'text-gray-500 bg-gray-100 border-gray-200'
            : 'text-red-600 bg-red-50 border-red-200'
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
      className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 text-gray-600
        hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? '처리 중...' : '출석 체크 +100P'}
    </button>
  )
}
