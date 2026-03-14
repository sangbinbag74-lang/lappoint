'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'
const SEASON = 2026

type JolpicaRace = {
  round: string
  raceName: string
  date: string
  time?: string
  Circuit: {
    Location: { country: string; locality: string }
  }
}

// 2026 F1 캘린더를 Jolpica API에서 가져와 races 테이블에 upsert
export async function syncF1Calendar() {
  const supabase = await createClient()

  // 관리자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const res = await fetch(`${JOLPICA_BASE}/${SEASON}.json`, {
    next: { revalidate: 3600 }, // 1시간 캐시
  })

  if (!res.ok) {
    return { success: false, error: 'API_FETCH_FAILED' }
  }

  const json = await res.json()
  const races: JolpicaRace[] = json?.MRData?.RaceTable?.Races ?? []

  if (races.length === 0) {
    return { success: false, error: 'NO_DATA' }
  }

  const now = new Date()

  const upsertRows = races.map((race) => {
    const raceDateStr = race.time
      ? `${race.date}T${race.time}` // UTC ISO 문자열
      : `${race.date}T14:00:00Z`    // time 없으면 오후 2시 UTC 기본값

    const raceDate = new Date(raceDateStr)
    const status = raceDate < now ? 'completed' : 'upcoming'

    return {
      // name을 unique key로 사용 (on_conflict)
      name: race.raceName,
      round: parseInt(race.round, 10),
      race_date: raceDateStr,
      status,
    }
  })

  const { error } = await supabase
    .from('races')
    .upsert(upsertRows, { onConflict: 'name', ignoreDuplicates: false })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/')

  return { success: true, count: upsertRows.length }
}

// 특정 라운드의 레이스 결과를 Jolpica API에서 가져옴 (어드민 정산 참고용)
export type RaceResult = {
  position: string
  Driver: { code: string; givenName: string; familyName: string }
  Constructor: { name: string }
  status: string
  points: string
}

export async function fetchRaceResults(round: number): Promise<{
  success: boolean
  results?: RaceResult[]
  raceName?: string
  error?: string
}> {
  const res = await fetch(`${JOLPICA_BASE}/${SEASON}/${round}/results.json`, {
    next: { revalidate: 300 }, // 5분 캐시
  })

  if (!res.ok) {
    return { success: false, error: 'API_FETCH_FAILED' }
  }

  const json = await res.json()
  const races = json?.MRData?.RaceTable?.Races ?? []

  if (races.length === 0) {
    return { success: false, error: 'NO_RESULTS_YET' }
  }

  return {
    success: true,
    raceName: races[0].raceName,
    results: races[0].Results as RaceResult[],
  }
}
