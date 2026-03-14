import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SettleForm from '@/components/SettleForm'
import SyncRacesButton from '@/components/SyncRacesButton'
import CreatePredictionForm from '@/components/CreatePredictionForm'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status, round')
    .order('race_date', { ascending: false })

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, race_id, question, options, correct_option, is_settled, prediction_type')
    .order('created_at', { ascending: true })

  const { data: betStats } = await supabase
    .from('bets')
    .select('prediction_id, bet_amount')

  // race_results 테이블에서 저장된 결과 로드 (API 재호출 없음)
  const { data: allRaceResults } = await supabase
    .from('race_results')
    .select('race_id, position, driver_code, driver_name, constructor_name')
    .order('position', { ascending: true })

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

  const resultsByRace = new Map<string, typeof allRaceResults>()
  if (allRaceResults) {
    for (const r of allRaceResults) {
      const list = resultsByRace.get(r.race_id) ?? []
      list.push(r)
      resultsByRace.set(r.race_id, list)
    }
  }

  const completedRaces = (races ?? [])
    .filter((r) => r.status === 'completed' && r.round != null)
    .map((r) => ({ id: r.id, name: r.name, round: r.round! }))

  const allRaces = (races ?? [])
    .filter((r) => r.round != null)
    .map((r) => ({ id: r.id, name: r.name, round: r.round! }))

  const statusLabel: Record<string, string> = {
    upcoming: '예측 가능',
    active: '진행 중',
    completed: '종료',
  }

  const statusColor: Record<string, string> = {
    upcoming: 'text-blue-700 border-blue-200 bg-blue-50',
    active: 'text-green-700 border-green-200 bg-green-50',
    completed: 'text-gray-500 border-gray-200 bg-gray-100',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Admin
              </span>
              <h1 className="text-xl font-black text-gray-900">관리자 대시보드</h1>
            </div>
            <p className="text-gray-400 text-sm">
              경기 결과를 확정하고 포인트를 정산합니다. 정산은 되돌릴 수 없습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/stats"
              className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              통계 보기 →
            </Link>
            <SyncRacesButton completedRaces={completedRaces} allRaces={allRaces} />
          </div>
        </div>
      </div>

      {races && races.length > 0 ? (
        races.map((race) => {
          const racePreds = predByRace.get(race.id) ?? []
          const raceResults = resultsByRace.get(race.id)
          const raceDate = new Date(race.race_date).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'short', day: 'numeric',
          })

          return (
            <section key={race.id} className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">{race.name}</h2>
                {race.round && <span className="text-gray-400 text-xs">R{race.round}</span>}
                <span className="text-gray-400 text-xs">{raceDate}</span>
                <span className={`ml-auto text-xs border px-2 py-0.5 rounded-full font-medium ${statusColor[race.status] ?? 'text-gray-500 border-gray-200'}`}>
                  {statusLabel[race.status] ?? race.status}
                </span>
              </div>

              {racePreds.length > 0 ? (
                <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                  {racePreds.map((pred) => (
                    <SettleForm
                      key={pred.id}
                      prediction={{
                        id: pred.id,
                        question: pred.question,
                        options: pred.options as string[],
                        is_settled: pred.is_settled,
                        correct_option: pred.correct_option,
                        prediction_type: pred.prediction_type ?? 'custom',
                      }}
                      stats={statsMap.get(pred.id) ?? { total_bets: 0, total_amount: 0 }}
                      raceResults={raceResults ?? undefined}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm pl-4">등록된 예측 항목 없음</p>
              )}
              <CreatePredictionForm raceId={race.id} />
            </section>
          )
        })
      ) : (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-400">등록된 경기가 없습니다.</p>
          <p className="text-gray-400 text-sm">
            우측 상단의 <strong className="text-gray-600">일정 동기화</strong> 버튼으로 2026 시즌 전체 일정을 불러오세요.
          </p>
        </div>
      )}
    </div>
  )
}
