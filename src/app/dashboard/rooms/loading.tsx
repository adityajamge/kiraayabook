function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Sk className="h-7 w-24" />
          <Sk className="h-4 w-36 mt-1" />
        </div>
        <div className="flex gap-2">
          <Sk className="h-9 w-9 rounded-xl" />
          <Sk className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Occupancy summary card */}
      <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-1.5">
              <div className="h-7 w-10 mx-auto bg-gray-700 rounded animate-pulse" />
              <div className="h-2.5 w-12 mx-auto bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <Sk key={i} className="h-8 w-20 rounded-full" />)}
      </div>

      {/* Room cards */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Sk className="h-5 w-20" />
              <Sk className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-4 mb-3">
              <Sk className="h-4 w-24" />
              <Sk className="h-4 w-20" />
            </div>
            <Sk className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
