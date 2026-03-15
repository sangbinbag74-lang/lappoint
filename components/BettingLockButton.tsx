'use client'

import { useTransition } from 'react'
import { toggleRaceBettingLock } from '@/app/actions/adminLock'

interface BettingLockButtonProps {
  raceId: string
  locked: boolean
}

export default function BettingLockButton({ raceId, locked }: BettingLockButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    startTransition(() => toggleRaceBettingLock(raceId, !locked))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50
        ${locked
          ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}
    >
      {isPending ? '...' : locked ? '🔒 잠금 중 (해제)' : '잠금'}
    </button>
  )
}
