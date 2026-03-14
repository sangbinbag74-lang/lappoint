'use client'

import { useState } from 'react'

interface Race {
  id: string
  name: string
  race_date: string
  status: string
  round: number | null
  betting_locked: boolean
}

interface AdminRaceSectionProps {
  race: Race
  raceDate: string
  statusLabel: string
  statusColor: string
  defaultOpen: boolean
  children: React.ReactNode
}

export default function AdminRaceSection({
  race,
  raceDate,
  statusLabel,
  statusColor,
  defaultOpen,
  children,
}: AdminRaceSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {race.betting_locked && (
          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex-shrink-0">
            배팅 금지
          </span>
        )}
        <span className="text-sm font-bold text-gray-900 truncate flex-1">
          {race.round && <span className="text-gray-400 font-normal mr-1.5">R{race.round}</span>}
          {race.name}
        </span>
        <span className="text-gray-400 text-xs flex-shrink-0 hidden sm:block">{raceDate}</span>
        <span className={`text-xs border px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-gray-400 text-xs flex-shrink-0 ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-white">
          {children}
        </div>
      )}
    </section>
  )
}
