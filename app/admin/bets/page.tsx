import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminBetsPage() {
  const supabase = createAdminClient()

  const { data: bets } = await supabase
    .from('bets')
    .select('id, bet_amount, fee_amount, selected_option, created_at, user_id, prediction_id, users(nickname), predictions(question, correct_option, is_settled, races(name))')
    .order('created_at', { ascending: false })
    .limit(500)

  const totalAmount = bets?.reduce((sum, b) => sum + b.bet_amount, 0) ?? 0
  const totalFee = bets?.reduce((sum, b) => sum + b.fee_amount, 0) ?? 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← 어드민</Link>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Bets</span>
          <h1 className="text-xl font-black text-gray-900">배팅 현황</h1>
        </div>
        <p className="text-gray-400 text-xs">{new Date().toLocaleString('ko-KR')}</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">총 배팅 건수</p>
          <p className="text-gray-900 font-black text-2xl tabular-nums">{(bets?.length ?? 0).toLocaleString()}건</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">총 배팅 금액</p>
          <p className="text-orange-500 font-black text-2xl tabular-nums">{totalAmount.toLocaleString()}P</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">총 수수료 (10%)</p>
          <p className="text-gray-500 font-black text-2xl tabular-nums">{totalFee.toLocaleString()}P</p>
        </div>
      </div>

      {/* 배팅 목록 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          전체 배팅 <span className="text-gray-400 font-normal normal-case">(최근 500건)</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs w-8">#</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">유저</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">경기</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">예측 항목</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">선택</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">금액</th>
                <th className="text-center px-4 py-2.5 text-gray-500 font-medium text-xs">결과</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bets && bets.length > 0 ? bets.map((b, i) => {
                const user = (b.users as unknown as { nickname: string } | null)
                const pred = b.predictions as unknown as { question: string; correct_option: string | null; is_settled: boolean; races: { name: string } | null } | null
                const isWin = pred?.is_settled && pred.correct_option === b.selected_option
                const isLoss = pred?.is_settled && pred.correct_option !== b.selected_option
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium text-xs">{user?.nickname ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[120px] truncate">{pred?.races?.name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[160px] truncate">{pred?.question ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-800 text-xs max-w-[140px] truncate font-medium">{b.selected_option}</td>
                    <td className="px-4 py-2.5 text-right text-orange-500 font-bold text-xs tabular-nums">
                      {b.bet_amount.toLocaleString()}P
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {!pred?.is_settled ? (
                        <span className="text-xs text-gray-400">대기</span>
                      ) : isWin ? (
                        <span className="text-xs font-bold text-green-600">적중</span>
                      ) : isLoss ? (
                        <span className="text-xs font-bold text-red-500">미적중</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">배팅 기록이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
