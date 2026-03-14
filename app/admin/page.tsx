import { createClient } from '@/lib/supabase/server'
import SettleForm from '@/components/SettleForm'
import SyncRacesButton from '@/components/SyncRacesButton'
import { fetchRaceResults } from '@/app/actions/syncRaces'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status, round')
    .order('race_date', { ascending: false })

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, race_id, question, options, correct_option, is_settled')
    .order('created_at', { ascending: true })

  const { data: betStats } = await supabase
    .from('bets')
    .select('prediction_id, bet_amount')

  const statsMap = new Map<string, { total_bets: number; total_amount: number }>()
  if (betStats) {
    for (const b of betStats) {
      const cur = statsMap.get(b.prediction_id) ?? { total_bets: 0, total_amount: 0 }
      statsMap.set(b.prediction_id, {
        total_bets: cur.total_bets + 1,
        total_amount: cur.total_amount + b.bet_amount,
      })
    }
  }

  const predByRace = new Map<string, typeof predictions>()
  if (predictions) {
    for (const p of predictions) {
      const list = predByRace.get(p.race_id) ?? []
      list.push(p)
      predByRace.set(p.race_id, list)
    }
  }

  // 완료된 경기의 실제 결과를 병렬로 가져옴 (round 있는 것만)
  const completedRaces = (races ?? []).filter(
    (r) => r.status === 'completed' && r.round != null
  )

  const resultsMap = new Map<string, Awaited<ReturnType<typeof fetchRaceResults>>>()
  await Promise.all(
    completedRaces.map(async (race) => {
      const result = await fetchRaceResults(race.round!)
      if (result.success) resultsMap.set(race.id, result)
    })
  )

  const statusLabel: Record<string, string> = {
    upcoming: '예측 가능',
    active: '진행 중',
    completed: '종료',
  }

  const statusColor: Record<string, string> = {
    upcoming: 'text-blue-400 border-blue-800 bg-blue-900/20',
    active: 'text-green-400 border-green-800 bg-green-900/20',
    completed: 'text-slate-400 border-slate-700 bg-slate-800/50',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 헤더 */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Admin
                </span>
                <h1 className="text-2xl font-black text-white">관리자 대시보드</h1>
              </div>
              <p className="text-slate-500 text-sm">
                경기 결과를 확정하고 포인트를 정산합니다. 정산은 되돌릴 수 없습니다.
              </p>
            </div>
            {/* F1 일정 동기화 버튼 */}
            <SyncRacesButton />
          </div>
        </div>

        {/* 경기 목록 */}
        {races && races.length > 0 ? (
          races.map((race) => {
            const racePreds = predByRace.get(race.id) ?? []
            const raceDate = new Date(race.race_date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
            const raceResult = resultsMap.get(race.id)

            return (
              <section key={race.id} className="space-y-3">
                {/* 경기 헤더 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-base font-bold text-slate-100">{race.name}</h2>
                  {race.round && (
                    <span className="text-slate-600 text-xs">R{race.round}</span>
                  )}
                  <span className="text-slate-500 text-xs">{raceDate}</span>
                  <span
                    className={`ml-auto text-xs border px-2 py-0.5 rounded font-medium ${
                      statusColor[race.status] ?? 'text-slate-400 border-slate-700'
                    }`}
                  >
                    {statusLabel[race.status] ?? race.status}
                  </span>
                </div>

                {/* 실제 레이스 결과 (완료된 경기만) */}
                {raceResult?.success && raceResult.results && (
                  <div className="bg-slate-900 border border-slate-800 rounded-md p-3">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      실제 레이스 결과 (Jolpica F1 API)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {raceResult.results.slice(0, 10).map((r) => (
                        <div key={r.position} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-5 text-center font-black ${
                              r.position === '1'
                                ? 'text-yellow-400'
                                : r.position === '2'
                                ? 'text-gray-300'
                                : r.position === '3'
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {r.position}
                          </span>
                          <span className="text-slate-200 font-medium w-8">{r.Driver.code}</span>
                          <span className="text-slate-500 truncate">
                            {r.Driver.givenName} {r.Driver.familyName}
                          </span>
                          <span className="text-slate-600 ml-auto">{r.Constructor.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 예측 항목 정산 */}
                {racePreds.length > 0 ? (
                  <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                    {racePreds.map((pred) => (
                      <SettleForm
                        key={pred.id}
                        prediction={{
                          id: pred.id,
                          question: pred.question,
                          options: pred.options as string[],
                          is_settled: pred.is_settled,
                          correct_option: pred.correct_option,
                        }}
                        stats={
                          statsMap.get(pred.id) ?? { total_bets: 0, total_amount: 0 }
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm pl-4">등록된 예측 항목 없음</p>
                )}
              </section>
            )
          })
        ) : (
          <div className="text-center py-16 space-y-4">
            <p className="text-slate-600">등록된 경기가 없습니다.</p>
            <p className="text-slate-700 text-sm">
              우측 상단의 <strong className="text-slate-500">F1 일정 동기화</strong> 버튼을 눌러
              2026 시즌 전체 일정을 자동으로 불러오세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
