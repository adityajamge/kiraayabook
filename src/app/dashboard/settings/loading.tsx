function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="space-y-1">
        <Sk className="h-5 w-32" />
        <Sk className="h-3.5 w-56" />
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700`}>
        {[...Array(rows * 2)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Sk className="h-3.5 w-24" />
            <Sk className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Sk className="h-8 w-24" />
        <Sk className="h-4 w-64" />
      </div>
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={1} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="space-y-1">
          <Sk className="h-5 w-20" />
          <Sk className="h-3.5 w-48" />
        </div>
        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
          {[1, 2, 3].map(i => <Sk key={i} className="h-9 w-20 rounded-lg" />)}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="space-y-1">
          <Sk className="h-5 w-28" />
          <Sk className="h-3.5 w-52" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Sk className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5">
              <Sk className="h-4 w-20" />
              <Sk className="h-3 w-36" />
            </div>
          </div>
          <Sk className="w-11 h-6 rounded-full" />
        </div>
      </div>
    </div>
  )
}
