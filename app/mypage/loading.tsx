export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      {/* 프로필 카드 스켈레톤 */}
      <div className="bg-gray-900 border border-gray-800 rounded-md p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-gray-800 rounded" />
            <div className="h-7 w-32 bg-gray-800 rounded" />
            <div className="h-4 w-40 bg-gray-800 rounded" />
            <div className="h-6 w-28 bg-gray-800 rounded mt-3" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-3 w-16 bg-gray-800 rounded ml-auto" />
            <div className="h-8 w-24 bg-gray-800 rounded" />
          </div>
        </div>

        {/* 스탯 4칸 스켈레톤 */}
        <div className="mt-5 pt-5 border-t border-gray-800 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-8 w-10 bg-gray-800 rounded" />
              <div className="h-3 w-8 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 배팅 내역 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-6 w-32 bg-gray-800 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-md p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 bg-gray-800 rounded" />
                <div className="h-4 w-3/4 bg-gray-800 rounded" />
              </div>
              <div className="h-5 w-14 bg-gray-800 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-gray-800 rounded" />
              <div className="h-3 w-32 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
