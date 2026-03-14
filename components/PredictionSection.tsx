'use client'

import { useState } from 'react'

interface PredictionSectionProps {
  title: string
  date: string | null
  isLocked: boolean
  defaultOpen: boolean
  icon: string
  iconColor: string
  children: React.ReactNode
}

export default function PredictionSection({
  title,
  date,
  isLocked,
  defaultOpen,
  icon,
  iconColor,
  children,
}: PredictionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const formattedDate = date
    ? new Date(date).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* 섹션 헤더 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs w-4 text-left">{open ? '▼' : '▶'}</span>
          <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${iconColor}`}>{icon}</span>
          <span className="font-bold text-gray-900 text-sm">{title}</span>
          {formattedDate && (
            <span className="text-gray-400 text-xs hidden sm:block">{formattedDate}</span>
          )}
          {isLocked && (
            <span className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              배팅 마감
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs font-medium">
          {open ? '접기' : '펼치기'}
        </span>
      </button>

      {/* 예측 목록 */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
