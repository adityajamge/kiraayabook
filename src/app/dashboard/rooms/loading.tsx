function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-24" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <Sk key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Sk className="h-5 w-20" />
              <Sk className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Sk className="h-4 w-24" />
              <Sk className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
