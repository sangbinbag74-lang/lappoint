'use client'

import { useTransition, useState } from 'react'
import { syncF1Calendar } from '@/app/actions/syncRaces'

export default function SyncRacesButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null)

  const handleSync = () => {
    startTransition(async () => {
      const res = await syncF1Calendar()
      setResult(res)
      setTimeout(() => setResult(null), 4000)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-bold px-4 py-2 rounded-md transition-colors"
      >
        {isPending ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            동기화 중...
          </>
        ) : (
          <>
            <span>↻</span>
            F1 일정 동기화
          </>
        )}
      </button>

      {result && (
        <span
          className={`text-xs font-medium ${
            result.success ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {result.success
            ? `✓ ${result.count}개 경기 동기화 완료`
            : `✗ 오류: ${result.error}`}
        </span>
      )}
    </div>
  )
}
