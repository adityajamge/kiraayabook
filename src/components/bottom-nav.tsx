'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, DollarSign, MoreHorizontal, Settings, Receipt, ChevronRight, Globe, MapPin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',         icon: LayoutDashboard, key: 'nav.home' },
  { href: '/dashboard/rooms',   icon: Building2,       key: 'nav.rooms' },
  { href: '/dashboard/tenants', icon: Users,           key: 'nav.tenants' },
  { href: '/dashboard/rent',    icon: DollarSign,      key: 'nav.rent' },
]

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
]

type PropertyItem = { id: string; name: string; address: string | null }

export function BottomNav({
  language,
  properties = [],
  activePropertyId = null,
}: {
  language: string
  properties?: PropertyItem[]
  activePropertyId?: string | null
}) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState(language)
  const [currentPropertyId, setCurrentPropertyId] = useState(activePropertyId)

  const moreActive = pathname.startsWith('/dashboard/settings') || pathname.startsWith('/dashboard/expenses') || pathname.startsWith('/dashboard/properties')

  const changeLanguage = async (lang: string) => {
    setCurrentLang(lang)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    router.refresh()
  }

  const selectProperty = async (property_id: string | null) => {
    setCurrentPropertyId(property_id)
    setOpen(false)
    await fetch('/api/auth/select-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id }),
    })
    router.refresh()
  }

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-4 bg-white dark:bg-gray-900 rounded-full shadow-[0_4px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-gray-800/60 flex z-50"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {navItems.map(({ href, icon: Icon, key }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200',
                active ? 'bg-gray-900 dark:bg-white' : ''
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-all',
                  active ? 'text-white dark:text-gray-900 stroke-[2.5]' : 'text-gray-400 dark:text-gray-500 stroke-2'
                )} />
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-colors',
                active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              )}>
                {t(key)}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
        >
          <div className={cn(
            'flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200',
            moreActive ? 'bg-gray-900 dark:bg-white' : ''
          )}>
            <MoreHorizontal className={cn(
              'w-5 h-5 transition-all',
              moreActive ? 'text-white dark:text-gray-900 stroke-[2.5]' : 'text-gray-400 dark:text-gray-500 stroke-2'
            )} />
          </div>
          <span className={cn(
            'text-[10px] font-medium transition-colors',
            moreActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
          )}>
            {t('nav.more')}
          </span>
        </button>
      </nav>

      {/* Backdrop — always mounted, fades in/out */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 bg-black/40 z-60 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />
      {/* Sheet — always mounted, slides up/down */}
      <div
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-70 bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4 transition-transform duration-300 ease-out will-change-transform',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <Link
              href="/dashboard/expenses"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-500" />
                </div>
                <span className="font-semibold text-[15px] dark:text-white">{t('nav.expenses')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/properties"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-semibold text-[15px] dark:text-white">{t('nav.properties')}</span>
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
                <span className="font-semibold text-[15px] dark:text-white">{t('nav.settings')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>

            {/* Property switcher — only shown when owner has multiple properties */}
            {properties.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 px-1 mb-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('properties.title')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {properties.map(p => {
                    const isActive = currentPropertyId === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectProperty(p.id)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                          isActive
                            ? 'bg-black dark:bg-white'
                            : 'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        <MapPin className={cn('w-4 h-4 shrink-0', isActive ? 'text-white dark:text-black' : 'text-gray-400 dark:text-gray-500')} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold truncate leading-tight', isActive ? 'text-white dark:text-black' : 'text-gray-800 dark:text-gray-200')}>
                            {p.name}
                          </p>
                          {p.address ? (
                            <p className={cn('text-[11px] truncate leading-tight mt-0.5', isActive ? 'text-white/70 dark:text-black/60' : 'text-gray-400 dark:text-gray-500')}>
                              {p.address}
                            </p>
                          ) : (
                            <p className={cn('text-[11px] leading-tight mt-0.5', isActive ? 'text-white/50 dark:text-black/40' : 'text-gray-300 dark:text-gray-600')}>
                              No address set
                            </p>
                          )}
                        </div>
                        {isActive && <Check className="w-4 h-4 shrink-0 text-white dark:text-black" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Language switcher */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 px-1 mb-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('settings.language')}</span>
              </div>
              <div className="flex gap-2">
                {LANGS.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => changeLanguage(code)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      currentLang === code
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
      </div>
    </>
  )
}
