import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-8xl font-bold text-gray-100 select-none mb-2">404</p>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Page not found</h1>
      <p className="text-sm text-gray-500 mb-8">This page doesn&apos;t exist or was moved.</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
      >
        <Home className="w-4 h-4" />
        Go to dashboard
      </Link>
    </div>
  )
}
