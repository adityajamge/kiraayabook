'use client'

import { useRouter } from 'next/navigation'
import { MapPin, LogOut, LayoutGrid } from 'lucide-react'

export function DashboardHeader({ orgName }: { orgName: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5 font-semibold">
          <LayoutGrid className="w-4 h-4" />
          KiraayaBook
        </div>
        <span className="text-gray-300 mx-1">|</span>
        <div className="flex items-center gap-1 text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          {orgName}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </header>
  )
}
