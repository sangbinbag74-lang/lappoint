'use client'

import { useTransition, useState } from 'react'
import { syncF1Calendar, syncRaceResults, syncQualifyingResults } from '@/app/actions/syncRaces'
import { generateRacePredictions } from '@/app/actions/predictions'

interface Race {
  id: string
  name: string
  round: number
}

interface Props {
  completedRaces?: Race[]
  allRaces?: Race[]
}

export default function SyncRacesButton({ completedRaces = [], allRaces = [] }: Props) {
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

  const handleQualifyingSync = () => {
    startTransition(async () => {
      let total = 0
      for (const race of completedRaces) {
        const res = await syncQualifyingResults(race.id, race.round)
        if (res.success) total += res.count ?? 0
      }
      setResult(`✓ 예선 결과 동기화 완료 (총 ${total}건)`)
      setTimeout(() => setResult(null), 5000)
    })
  }

  const handleGeneratePredictions = () => {
    startTransition(async () => {
      let created = 0
      let skipped = 0
      for (const race of allRaces) {
        const res = await generateRacePredictions(race.id, race.round ?? 0)
        if (res.success) created++
        else if (res.error === 'ALREADY_EXISTS') skipped++
      }
      setResult(`✓ 예측 자동 생성: ${created}개 경기 생성, ${skipped}개 skip`)
      setTimeout(() => setResult(null), 6000)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {/* 일정 동기화 */}
        <button
          onClick={handleCalendarSync}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 transition-colors"
        >
          {isPending ? <Spinner /> : <span>↻</span>}
          일정 동기화
        </button>

        {/* 예측 자동 생성 */}
        {allRaces.length > 0 && (
          <button
            onClick={handleGeneratePredictions}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            {isPending ? <Spinner light /> : <span>✦</span>}
            예측 자동 생성
          </button>
        )}

        {/* 결과/예선 동기화 (완료된 경기 있을 때만) */}
        {completedRaces.length > 0 && (
          <>
            <button
              onClick={handleResultsSync}
              disabled={isPending}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              {isPending ? <Spinner light /> : <span>⬇</span>}
              결과 동기화
            </button>

            <button
              onClick={handleQualifyingSync}
              disabled={isPending}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 transition-colors"
            >
              {isPending ? <Spinner /> : <span>Q</span>}
              예선 동기화
            </button>
          </>
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

function Spinner({ light }: { light?: boolean }) {
  return (
    <span className={`inline-block w-3 h-3 border-2 rounded-full animate-spin ${
      light ? 'border-white/30 border-t-white' : 'border-gray-200 border-t-gray-600'
    }`} />
  )
}
