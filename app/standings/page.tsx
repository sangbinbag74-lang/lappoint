import { TEAM_COLORS } from '@/lib/constants/teamColors'

const YEAR = 2026

interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    code: string
    givenName: string
    familyName: string
    nationality: string
  }
  Constructor: {
    name: string
  }
}

interface ConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: {
    name: string
    nationality: string
  }
}

const CONSTRUCTOR_COLORS: Record<string, string> = {
  'Red Bull': '#3671C6',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#358C75',
  'Alpine': '#FF87BC',
  'RB': '#6692FF',
  'Racing Bulls': '#6692FF',
  'Haas': '#B6BABD',
  'Kick Sauber': '#52E252',
  'Sauber': '#52E252',
  'Williams': '#64C4FF',
}

export default async function StandingsPage() {
  let driverStandings: DriverStanding[] = []
  let constructorStandings: ConstructorStanding[] = []

  try {
    const [driverRes, constructorRes] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${YEAR}/driverstandings.json`, { cache: 'no-store' }),
      fetch(`https://api.jolpi.ca/ergast/f1/${YEAR}/constructorstandings.json`, { cache: 'no-store' }),
    ])

    if (driverRes.ok) {
      const data = await driverRes.json()
      driverStandings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
    }
    if (constructorRes.ok) {
      const data = await constructorRes.json()
      constructorStandings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
    }
  } catch {
    // API 오류 시 빈 배열 유지
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <h1 className="text-xl font-black text-gray-900">{YEAR} F1 순위</h1>

      {/* 드라이버 순위 */}
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-3">드라이버 순위</h2>
        {driverStandings.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5 text-left w-8">#</th>
                  <th className="px-4 py-2.5 text-left">드라이버</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell">팀</th>
                  <th className="px-4 py-2.5 text-right w-14">우승</th>
                  <th className="px-4 py-2.5 text-right w-16">포인트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {driverStandings.map((d) => {
                  const code = d.Driver.code?.toUpperCase()
                  const color = code ? TEAM_COLORS[code] : null
                  return (
                    <tr key={d.Driver.driverId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="relative px-4 py-3 text-gray-400 font-medium tabular-nums">
                        {color && (
                          <span
                            className="absolute left-0 top-0 bottom-0 w-0.5"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        {d.position}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {d.Driver.givenName} {d.Driver.familyName}
                        </span>
                        {code && (
                          <span className="ml-1.5 text-xs text-gray-400 font-mono">{code}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {d.Constructor.name}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                        {d.wins}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                        {d.points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 shadow-sm text-sm">
            아직 순위 데이터가 없습니다.
          </div>
        )}
      </section>

      {/* 컨스트럭터 순위 */}
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-3">컨스트럭터 순위</h2>
        {constructorStandings.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5 text-left w-8">#</th>
                  <th className="px-4 py-2.5 text-left">팀</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell">국적</th>
                  <th className="px-4 py-2.5 text-right w-14">우승</th>
                  <th className="px-4 py-2.5 text-right w-16">포인트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {constructorStandings.map((c) => {
                  const color = CONSTRUCTOR_COLORS[c.Constructor.name] ?? null
                  return (
                    <tr key={c.Constructor.name} className="hover:bg-gray-50/60 transition-colors">
                      <td className="relative px-4 py-3 text-gray-400 font-medium tabular-nums">
                        {color && (
                          <span
                            className="absolute left-0 top-0 bottom-0 w-0.5"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        {c.position}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {c.Constructor.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {c.Constructor.nationality}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                        {c.wins}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                        {c.points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 shadow-sm text-sm">
            아직 순위 데이터가 없습니다.
          </div>
        )}
      </section>
    </div>
  )
}
