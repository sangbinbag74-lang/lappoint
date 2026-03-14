'use client'

import { useTransition, useState } from 'react'
import { syncF1Calendar, syncRaceResults } from '@/app/actions/syncRaces'

interface CompletedRace {
  id: string
  name: string
  round: number
}

interface Props {
  completedRaces?: CompletedRace[]
}

export default function SyncRacesButton({ completedRaces = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  const handleCalendarSync = () => {
    startTransition(async () => {
      const res = await syncF1Calendar()
      setResult(res.success ? `✓ ${res.count}개 경기 일정 동기화 완료` : `✗ ${res.error}`)
      setTimeout(() => setResult(null), 4000)
    })
  }

  const handleResultsSync = () => {
    startTransition(async () => {
      let total = 0
      for (const race of completedRaces) {
        const res = await syncRaceResults(race.id, race.round)
        if (res.success) total += res.count ?? 0
      }
      setResult(`✓ ${completedRaces.length}개 경기 결과 동기화 완료 (총 ${total}건)`)
      setTimeout(() => setResult(null), 5000)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {/* 일정 동기화 */}
        <button
          onClick={handleCalendarSync}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 transition-colors"
        >
          {isPending
            ? <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            : <span>↻</span>
          }
          일정 동기화
        </button>

        {/* 결과 동기화 (완료된 경기 있을 때만) */}
        {completedRaces.length > 0 && (
          <button
            onClick={handleResultsSync}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            {isPending
              ? <span className="inline-block w-3 h-3 border-2 border-blue-300 border-t-white rounded-full animate-spin" />
              : <span>⬇</span>
            }
            결과 동기화
          </button>
        )}
      </div>

      {result && (
        <span className={`text-xs font-medium ${result.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {result}
        </span>
      )}
    </div>
  )
}
