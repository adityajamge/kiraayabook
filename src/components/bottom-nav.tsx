'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, CreditCard, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/rooms', icon: Building2, label: 'Rooms' },
  { href: '/dashboard/tenants', icon: Users, label: 'Tenants' },
  { href: '/dashboard/rent', icon: CreditCard, label: 'Rent' },
  { href: '/dashboard/documents', icon: FileText, label: 'Docs' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-stretch z-50 safe-area-pb">
      {nav.map(({ href, icon: Icon, label }) => {
        const active =
          href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
              active ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Icon className={cn('w-5 h-5', active ? 'stroke-[2.5]' : 'stroke-2')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
