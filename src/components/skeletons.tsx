function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Sk className="h-7 w-36 mb-2" />
        <Sk className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <Sk className="h-4 w-24" />
              <Sk className="w-8 h-8 rounded-lg" />
            </div>
            <Sk className="h-9 w-20 mb-1.5" />
            <Sk className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Sk className="h-5 w-28 mb-1.5" />
                <Sk className="h-3.5 w-44" />
              </div>
              <Sk className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 p-2.5">
                  <Sk className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-4 w-32" />
                    <Sk className="h-3 w-20" />
                  </div>
                  <Sk className="h-4 w-14 shrink-0" />
                  <Sk className="w-8 h-8 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {[...Array(cols)].map((_, i) => (
              <th key={i} className="px-5 py-3.5 text-left">
                <Sk className={`h-3 ${COL_WIDTHS[i % COL_WIDTHS.length]}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, row) => (
            <tr key={row} className="border-b border-gray-50">
              {[...Array(cols)].map((_, col) => (
                <td key={col} className="px-5 py-4">
                  {hasAvatar && col === 0 ? (
                    <div className="flex items-center gap-2.5">
                      <Sk className="w-8 h-8 rounded-full shrink-0" />
                      <Sk className={`h-4 ${row % 2 === 0 ? 'w-28' : 'w-24'}`} />
                    </div>
                  ) : (
                    <Sk
                      className={`h-4 ${
                        col === cols - 1
                          ? 'w-12'
                          : row % 3 === 0
                          ? COL_WIDTHS[(col + 1) % COL_WIDTHS.length]
                          : COL_WIDTHS[col % COL_WIDTHS.length]
                      }`}
                    />
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
