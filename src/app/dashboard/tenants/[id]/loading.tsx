function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <Sk className="h-4 w-28" />

      {/* Hero card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <Sk className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Sk className="h-6 w-36" />
                <Sk className="h-4 w-24" />
              </div>
              <Sk className="h-6 w-16 rounded-full shrink-0" />
            </div>
            <div className="flex gap-3 mt-3">
              <Sk className="h-4 w-20" />
              <Sk className="h-4 w-16" />
              <Sk className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Sk className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Rent snapshot */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2">
            <Sk className="w-7 h-7 rounded-full" />
            <Sk className="h-3.5 w-12" />
            <Sk className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {[1, 2, 3].map(i => <Sk key={i} className="flex-1 h-8 rounded-lg" />)}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-3 w-16" />
              <Sk className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
