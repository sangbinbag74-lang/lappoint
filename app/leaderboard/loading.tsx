export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-800 rounded" />
        <div className="h-8 w-24 bg-gray-800 rounded" />
      </div>

      {/* 탭 스켈레톤 */}
      <div className="flex gap-2">
        <div className="h-9 w-24 bg-gray-800 rounded-md" />
        <div className="h-9 w-28 bg-gray-800 rounded-md" />
      </div>

      {/* 테이블 스켈레톤 */}
      <div className="bg-gray-900 border border-gray-800 rounded-md overflow-hidden">
        <div className="h-10 bg-gray-800/50 border-b border-gray-800" />
        <div className="divide-y divide-gray-800/60">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-5 w-6 bg-gray-800 rounded" />
              <div className="h-4 flex-1 bg-gray-800 rounded" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
