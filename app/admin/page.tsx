import { createClient } from '@/lib/supabase/server'
import SettleForm from '@/components/SettleForm'

export default async function AdminPage() {
  const supabase = await createClient()

  // 모든 races 조회 (날짜 내림차순)
  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status')
    .order('race_date', { ascending: false })

  // 모든 predictions + 베팅 집계
  // bets 테이블을 집계하여 각 prediction별 참여자 수 / 총 배팅액 계산
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, race_id, question, options, correct_option, is_settled')
    .order('created_at', { ascending: true })

  const { data: betStats } = await supabase
    .from('bets')
    .select('prediction_id, bet_amount')

  // prediction_id별 집계
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

  // race별 predictions 그룹핑
  const predByRace = new Map<string, typeof predictions>()
  if (predictions) {
    for (const p of predictions) {
      const list = predByRace.get(p.race_id) ?? []
      list.push(p)
      predByRace.set(p.race_id, list)
    }
  }

  const statusLabel: Record<string, string> = {
    upcoming: '예측 가능',
    active: '진행 중',
    completed: '종료',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 헤더 */}
        <div className="border-b border-slate-800 pb-6">
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

        {/* 경기 목록 */}
        {races && races.length > 0 ? (
          races.map((race) => {
            const racePreds = predByRace.get(race.id) ?? []
            const raceDate = new Date(race.race_date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })

            return (
              <section key={race.id} className="space-y-3">
                {/* 경기 헤더 */}
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-slate-100">{race.name}</h2>
                  <span className="text-slate-500 text-xs">{raceDate}</span>
                  <span className="ml-auto text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">
                    {statusLabel[race.status] ?? race.status}
                  </span>
                </div>

                {/* 예측 항목 목록 */}
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
          <div className="text-center py-16 text-slate-600">
            등록된 경기가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
