function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      {/* PG identity bar */}
      <div className="flex items-center justify-between">
        <div>
          <Sk className="h-5 w-32" />
          <Sk className="h-3.5 w-48 mt-1" />
        </div>
        <Sk className="w-10 h-10 rounded-full shrink-0" />
      </div>

      {/* Greeting banner */}
      <Sk className="h-20 w-full rounded-2xl" />

      {/* 3-col occupancy chips */}
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center">
            <Sk className="h-7 w-10 mx-auto mb-1" />
            <Sk className="h-3 w-14 mx-auto" />
          </div>
        ))}
      </div>

      {/* Rent overview card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Sk className="h-4 w-28 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
          <Sk className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex justify-between mb-3">
          <Sk className="h-8 w-24" />
          <Sk className="h-8 w-24" />
        </div>
        <Sk className="h-2 w-full rounded-full" />
      </div>

      {/* Expenses + Net Income */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <Sk className="w-8 h-8 rounded-full mb-2" />
            <Sk className="h-3 w-16 mb-1" />
            <Sk className="h-7 w-24 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Pending rent list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Sk className="h-4 w-32" />
          <Sk className="h-6 w-8 rounded-full" />
        </div>
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <Sk className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-4 w-28" />
                <Sk className="h-3 w-16" />
              </div>
              <Sk className="h-4 w-12 shrink-0" />
              <Sk className="w-8 h-8 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const COL_WIDTHS = ['w-24', 'w-16', 'w-20', 'w-14', 'w-18', 'w-16', 'w-12', 'w-16']

export function TableSkeleton({
  cols,
  rows = 6,
  hasAvatar = false,
}: {
  cols: number
  rows?: number
  hasAvatar?: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
      <table className="w-full min-w-120">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            {[...Array(cols)].map((_, i) => (
              <th key={i} className="px-5 py-3.5 text-left">
                <Sk className={`h-3 ${COL_WIDTHS[i % COL_WIDTHS.length]}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, row) => (
            <tr key={row} className="border-b border-gray-50 dark:border-gray-800/60">
              {[...Array(cols)].map((_, col) => (
                <td key={col} className="px-5 py-4">
                  {hasAvatar && col === 0 ? (
                    <div className="flex items-center gap-2.5">
                      <Sk className="w-8 h-8 rounded-full shrink-0" />
                      <Sk className={`h-4 ${row % 2 === 0 ? 'w-28' : 'w-24'}`} />
                    </div>
                  ) : (
                    <Sk className={`h-4 ${col === cols - 1 ? 'w-12' : row % 3 === 0 ? COL_WIDTHS[(col + 1) % COL_WIDTHS.length] : COL_WIDTHS[col % COL_WIDTHS.length]}`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
