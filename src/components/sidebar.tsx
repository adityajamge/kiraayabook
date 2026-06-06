'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, CreditCard, LayoutGrid, Settings, Receipt } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

const navItems = [
  { href: '/dashboard',           icon: LayoutDashboard, key: 'nav.dashboard' },
  { href: '/dashboard/rooms',     icon: Building2,       key: 'nav.rooms' },
  { href: '/dashboard/tenants',   icon: Users,           key: 'nav.tenants' },
  { href: '/dashboard/rent',      icon: CreditCard,      key: 'nav.rent' },
  { href: '/dashboard/expenses',  icon: Receipt,         key: 'nav.expenses' },
  { href: '/dashboard/settings',  icon: Settings,        key: 'nav.settings' },
]

export function Sidebar({ orgName, logoUrl }: { orgName: string; logoUrl?: string | null }) {
  const t = useT()
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-56 xl:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${logoUrl ? '' : 'bg-black dark:bg-white'}`}>
            {logoUrl ? (
              <Image src={logoUrl} alt="logo" width={32} height={32} className="object-contain w-full h-full" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-white dark:text-black" />
            )}
          </div>
          <span className="font-bold text-base truncate dark:text-white">{orgName}</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, key }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {t(key)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
