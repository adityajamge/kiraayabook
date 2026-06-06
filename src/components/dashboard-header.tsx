'use client'

import { useRouter } from 'next/navigation'
import { MapPin, LogOut } from 'lucide-react'
import { useT } from '@/lib/i18n'

export function DashboardHeader({ orgName }: { orgName: string }) {
  const t = useT()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="hidden lg:flex h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-semibold text-gray-900 dark:text-white">{orgName}</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">{t('common.logout')}</span>
      </button>
    </header>
  )
}
