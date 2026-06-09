function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Sk className="h-8 w-28" />
          <Sk className="h-3.5 w-20" />
        </div>
        <Sk className="h-9 w-9 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Sk className="w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <Sk className="h-5 w-40" />
                <Sk className="h-3.5 w-56" />
                <div className="flex gap-2 pt-2">
                  <Sk className="h-6 w-20 rounded-full" />
                  <Sk className="h-6 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Sk className="w-8 h-8 rounded-xl" />
                <Sk className="w-8 h-8 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
