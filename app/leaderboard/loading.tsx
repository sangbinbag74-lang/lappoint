export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="h-7 w-16 bg-gray-200 rounded" />

      {/* 탭 스켈레톤 */}
      <div className="flex gap-0 border-b border-gray-200 pb-0">
        <div className="h-10 w-24 bg-gray-100 rounded-t" />
        <div className="h-10 w-28 bg-gray-100 rounded-t ml-1" />
      </div>

      {/* 테이블 스켈레톤 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-5 w-6 bg-gray-100 rounded" />
              <div className="h-4 flex-1 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
