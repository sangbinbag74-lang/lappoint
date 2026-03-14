import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const siteUrl = 'https://lappoint.xyz'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: races } = await supabase
    .from('races')
    .select('id, race_date')
    .order('race_date', { ascending: false })

  const raceUrls: MetadataRoute.Sitemap = (races ?? []).map((race) => ({
    url: `${siteUrl}/predict/${race.id}`,
    lastModified: new Date(race.race_date),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: siteUrl,                        lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${siteUrl}/races`,             lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${siteUrl}/standings`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${siteUrl}/leaderboard`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.7 },
    ...raceUrls,
  ]
}
