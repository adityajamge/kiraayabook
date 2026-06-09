function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-5 max-w-2xl lg:max-w-none">
      <div className="flex items-center justify-between">
        <Sk className="h-8 w-24" />
        <Sk className="h-9 w-9 rounded-xl" />
      </div>
      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        <Sk className="h-9 w-9 rounded-xl" />
        <Sk className="h-5 w-36" />
        <Sk className="h-9 w-9 rounded-xl" />
      </div>
      {/* Summary card */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Sk className="h-2.5 w-20" />
            <Sk className="h-8 w-28" />
            <Sk className="h-2.5 w-14" />
          </div>
          <Sk className="w-12 h-12 rounded-2xl" />
        </div>
      </div>
      {/* Expense list */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <Sk className="w-9 h-9 rounded-xl shrink-0" />
            <Sk className={`h-4 flex-1 ${i % 2 === 0 ? 'max-w-48' : 'max-w-36'}`} />
            <Sk className="h-5 w-16 shrink-0" />
            <Sk className="w-8 h-8 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
