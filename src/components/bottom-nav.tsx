'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, DollarSign, MoreHorizontal, Settings, Receipt, ChevronRight, Globe, MapPin, UserCog, Check } from 'lucide-react'
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

type PropertyItem = { id: string; name: string }

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

  const moreActive = pathname.startsWith('/dashboard/settings') || pathname.startsWith('/dashboard/expenses') || pathname.startsWith('/dashboard/properties') || pathname.startsWith('/dashboard/staff')

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
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ href, icon: Icon, key }) => {
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
              {t(key)}
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
          {t('nav.more')}
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
              href="/dashboard/staff"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-purple-500" />
                </div>
                <span className="font-semibold text-[15px] dark:text-white">{t('nav.staff')}</span>
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

            {/* Property switcher */}
            {properties.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 px-1 mb-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('properties.title')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => selectProperty(null)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      currentPropertyId === null
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {t('properties.allProperties')}
                    {currentPropertyId === null && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {properties.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProperty(p.id)}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        currentPropertyId === p.id
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                      {currentPropertyId === p.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
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
      )}
    </>
  )
}
