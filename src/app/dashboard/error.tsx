'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
      <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Something went wrong</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
        This page failed to load. Try again or refresh the page.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  )
}
