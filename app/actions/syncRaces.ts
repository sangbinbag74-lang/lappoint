'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'
const SEASON = 2026

type JolpicaSession = { date: string; time?: string }

type JolpicaRace = {
  round: string
  raceName: string
  date: string
  time?: string
  Circuit: {
    Location: { country: string; locality: string }
  }
  Qualifying?: JolpicaSession
  Sprint?: JolpicaSession
  SprintQualifying?: JolpicaSession
  SprintShootout?: JolpicaSession  // 일부 API 버전 호환
}

function toISOString(session: JolpicaSession | undefined): string | null {
  if (!session) return null
  return session.time
    ? `${session.date}T${session.time}`
    : `${session.date}T14:00:00Z`
}

// 2026 F1 캘린더를 Jolpica API에서 가져와 races 테이블에 upsert
export async function syncF1Calendar() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const res = await fetch(`${JOLPICA_BASE}/${SEASON}.json`, {
    next: { revalidate: 3600 },
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
      ? `${race.date}T${race.time}`
      : `${race.date}T14:00:00Z`

    const raceDate = new Date(raceDateStr)
    const status = raceDate < now ? 'completed' : 'upcoming'

    return {
      name: race.raceName,
      round: parseInt(race.round, 10),
      race_date: raceDateStr,
      status,
      qualifying_date: toISOString(race.Qualifying),
      sprint_date: toISOString(race.Sprint),
      sprint_qualifying_date: toISOString(race.SprintQualifying ?? race.SprintShootout),
    }
  })

  const { error } = await adminSupabase
    .from('races')
    .upsert(upsertRows, { onConflict: 'name', ignoreDuplicates: false })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/')

  return { success: true, count: upsertRows.length }
}

// Jolpica API 결과를 race_results 테이블에 저장 (어드민 전용)
export async function syncRaceResults(raceId: string, round: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const res = await fetch(`${JOLPICA_BASE}/${SEASON}/${round}/results.json`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return { success: false, error: 'API_FETCH_FAILED' }
  }

  const json = await res.json()
  const apiRaces = json?.MRData?.RaceTable?.Races ?? []

  if (apiRaces.length === 0) {
    return { success: false, error: 'NO_RESULTS_YET' }
  }

  const apiResults = apiRaces[0].Results as Array<{
    position: string
    Driver: { code: string; givenName: string; familyName: string }
    Constructor: { name: string }
    status: string
    FastestLap?: { rank: string }
  }>

  const rows = apiResults.map((r) => ({
    race_id: raceId,
    position: parseInt(r.position, 10),
    driver_code: r.Driver.code,
    driver_name: `${r.Driver.givenName} ${r.Driver.familyName}`,
    constructor_name: r.Constructor.name,
    status: r.status,
    is_fastest_lap: r.FastestLap?.rank === '1',
    synced_at: new Date().toISOString(),
  }))

  const { error } = await adminSupabase
    .from('race_results')
    .upsert(rows, { onConflict: 'race_id,position' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, count: rows.length }
}

// 예선 결과를 qualifying_results 테이블에 저장 (어드민 전용)
export async function syncQualifyingResults(raceId: string, round: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const res = await fetch(`${JOLPICA_BASE}/${SEASON}/${round}/qualifying.json`, {
    cache: 'no-store',
  })

  if (!res.ok) return { success: false, error: 'API_FETCH_FAILED' }

  const json = await res.json()
  const apiRaces = json?.MRData?.RaceTable?.Races ?? []

  if (apiRaces.length === 0) return { success: false, error: 'NO_RESULTS_YET' }

  const apiResults = apiRaces[0].QualifyingResults as Array<{
    position: string
    Driver: { code: string; givenName: string; familyName: string }
    Constructor: { name: string }
    Q1?: string
    Q2?: string
    Q3?: string
  }>

  const rows = apiResults.map((r) => ({
    race_id: raceId,
    position: parseInt(r.position, 10),
    driver_code: r.Driver.code,
    driver_name: `${r.Driver.givenName} ${r.Driver.familyName}`,
    constructor_name: r.Constructor.name,
    q1_time: r.Q1 ?? null,
    q2_time: r.Q2 ?? null,
    q3_time: r.Q3 ?? null,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await adminSupabase
    .from('qualifying_results')
    .upsert(rows, { onConflict: 'race_id,position' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true, count: rows.length }
}
