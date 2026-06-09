function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center justify-between">
          <Sk className="h-8 w-28" />
          <Sk className="w-9 h-9 rounded-full" />
        </div>
        <Sk className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <Sk key={i} className="h-8 w-20 rounded-full shrink-0" />)}
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <Sk className="w-11 h-11 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-4 w-28" />
                <Sk className="h-3 w-20" />
                <Sk className="h-3 w-24" />
              </div>
              <Sk className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden lg:block space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Sk className="h-8 w-28" />
            <Sk className="h-4 w-64" />
          </div>
          <Sk className="h-9 w-36 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Sk className="h-9 flex-1 max-w-sm rounded-lg" />
          <Sk className="h-9 w-32 rounded-lg" />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-3.5 flex gap-8">
            {[80, 96, 80, 48].map((w, i) => <Sk key={i} className={`h-3 w-${w === 48 ? '12' : w === 80 ? '20' : '24'}`} />)}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border-b border-gray-50 dark:border-gray-800 px-5 py-4 flex gap-8 items-center">
              <Sk className="h-4 w-28" />
              <Sk className="h-4 w-20" />
              <Sk className="h-4 w-24" />
              <Sk className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
