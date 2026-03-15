import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteComment } from '@/app/actions/adminUsers'
import SuspendCommentUserButton from '@/components/SuspendCommentUserButton'

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  const [
    { data: users },
    { data: comments },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, nickname, point_balance, created_at')
      .order('point_balance', { ascending: false }),
    supabase
      .from('bet_comments')
      .select('id, content, created_at, user_id, prediction_id, users(nickname), predictions(question, races(name))')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← 어드민</Link>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Users</span>
          <h1 className="text-xl font-black text-gray-900">유저 관리</h1>
        </div>
        <p className="text-gray-400 text-xs">{new Date().toLocaleString('ko-KR')}</p>
      </div>

      {/* 댓글 전체 목록 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          전체 댓글 <span className="text-gray-400 font-normal normal-case">({comments?.length ?? 0}개)</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs w-8">#</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">작성자</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">경기</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">예측 항목</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">내용</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">날짜</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comments && comments.length > 0 ? comments.map((c, i) => {
                const author = (c.users as unknown as { nickname: string } | null)?.nickname ?? '알 수 없음'
                const pred = c.predictions as unknown as { question: string; races: { name: string } | null } | null
                const raceName = pred?.races?.name ?? '-'
                const question = pred?.question ?? '-'
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium text-xs">{author}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[120px] truncate">{raceName}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[160px] truncate">{question}</td>
                    <td className="px-4 py-2.5 text-gray-800 text-xs max-w-[200px] truncate">{c.content}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <SuspendCommentUserButton userId={c.user_id} />
                        <form action={deleteComment.bind(null, c.id)}>
                          <button type="submit" className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap">
                            댓글 삭제
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">댓글이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 유저 목록 (조회 전용) */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          전체 회원 <span className="text-gray-400 font-normal normal-case">({users?.length ?? 0}명)</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs w-8">#</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">닉네임</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">포인트</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users && users.length > 0 ? users.map((u, i) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium text-sm">{u.nickname}</td>
                  <td className="px-4 py-2.5 text-right text-orange-500 font-bold text-sm tabular-nums">
                    {u.point_balance.toLocaleString()}P
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">회원이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
