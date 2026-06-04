'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, DollarSign, MoreHorizontal, FileText, Settings, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const nav = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/rooms',   icon: Building2,       label: 'Rooms' },
  { href: '/dashboard/tenants', icon: Users,           label: 'Tenants' },
  { href: '/dashboard/rent',    icon: DollarSign,      label: 'Rent' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const moreActive = pathname.startsWith('/dashboard/documents') || pathname.startsWith('/dashboard/settings')

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors',
                active ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <Icon className={cn('w-5 h-5', active ? 'stroke-[2.5]' : 'stroke-2')} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors',
            moreActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          <MoreHorizontal className={cn('w-5 h-5', moreActive ? 'stroke-[2.5]' : 'stroke-2')} />
          More
        </button>
      </nav>

      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-60"
            onClick={() => setOpen(false)}
          />
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-70 bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <Link
              href="/dashboard/documents"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="font-semibold text-[15px] dark:text-white">Documents</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-black dark:bg-white rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="font-semibold text-[15px] dark:text-white">Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </>
      )}
    </>
  )
}
