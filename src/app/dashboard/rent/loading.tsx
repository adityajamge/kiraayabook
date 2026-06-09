function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-16" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <div className="flex items-center gap-2">
        <Sk className="h-9 w-9 rounded-xl" />
        <Sk className="h-9 flex-1 rounded-xl" />
        <Sk className="h-9 w-9 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center">
            <Sk className="h-6 w-12 mx-auto mb-1" />
            <Sk className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
            <Sk className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-4 w-28" />
              <Sk className="h-3 w-20" />
            </div>
            <Sk className="h-5 w-16 shrink-0" />
            <Sk className="w-8 h-8 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
