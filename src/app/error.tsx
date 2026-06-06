'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        An unexpected error occurred. Try again or go back to the dashboard.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
