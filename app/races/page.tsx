import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getRaceCountryCode } from '@/lib/constants/raceFlags'

export default async function RacesHistoryPage() {
  const supabase = await createClient()

  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status, round')
    .eq('status', 'completed')
    .order('race_date', { ascending: false })

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, race_id, question, correct_option, is_settled')
    .eq('is_settled', true)

  const settledByRace = new Map<string, number>()
  if (predictions) {
    for (const p of predictions) {
      settledByRace.set(p.race_id, (settledByRace.get(p.race_id) ?? 0) + 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 홈</Link>
        <h1 className="text-xl font-black text-gray-900">이전 경기 전체 보기</h1>
      </div>

      {races && races.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {races.map((race) => {
            const date = new Date(race.race_date).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
            })
            const countryCode = getRaceCountryCode(race.name)
            const settledCount = settledByRace.get(race.id) ?? 0

            return (
              <Link
                key={race.id}
                href={`/predict/${race.id}`}
                className="relative flex items-center justify-between px-4 py-4 overflow-hidden hover:bg-gray-50/80 transition-colors group"
              >
                {/* 국기 이미지 오버레이 */}
                {countryCode && (
                  <div className="absolute right-0 top-0 h-full w-32 pointer-events-none overflow-hidden">
                    <Image
                      src={`https://flagcdn.com/w320/${countryCode}.png`}
                      alt=""
                      fill
                      className="object-cover object-center opacity-25"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent" />
                  </div>
                )}

                <div className="relative min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {race.round && (
                      <span className="text-gray-400 text-xs">R{race.round}</span>
                    )}
                    <span className="text-gray-800 font-semibold text-sm truncate group-hover:text-gray-900">
                      {race.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{date}</span>
                    {settledCount > 0 && (
                      <>
                        <span>·</span>
                        <span>정산 완료 {settledCount}개</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="relative text-gray-500 text-xs font-semibold group-hover:underline flex-shrink-0 ml-3">
                  결과 보기 →
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 shadow-sm">
          종료된 경기가 없습니다.
        </div>
      )}
    </div>
  )
}
