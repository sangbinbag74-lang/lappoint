export default function Loading() {
  return (
    <div className="flex gap-4 items-start max-w-5xl mx-auto animate-pulse">
      {/* 왼쪽 메인 컬럼 */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* 경기 헤더 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-6 w-56 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        </div>

        {/* 예측 항목 섹션 */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="h-4 w-8 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2].map((j) => (
                <div key={j} className="px-4 py-4 space-y-3">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-9 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 우측 라이브 채팅 */}
      <div className="hidden lg:block w-72 flex-shrink-0 sticky top-16">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-[calc(100vh-80px)]">
          <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="p-3 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
