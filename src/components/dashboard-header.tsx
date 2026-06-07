'use client'

import { useRouter } from 'next/navigation'
import { MapPin, LogOut, Globe, Check, ChevronDown } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
]

type PropertyItem = { id: string; name: string; address: string | null }

export function DashboardHeader({
  orgName,
  language,
  properties = [],
  activePropertyId = null,
  cookieSet = true,
}: {
  orgName: string
  language: string
  properties?: PropertyItem[]
  activePropertyId?: string | null
  cookieSet?: boolean
}) {
  const t = useT()
  const router = useRouter()
  const [langOpen, setLangOpen] = useState(false)
  const [propOpen, setPropOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const propRef = useRef<HTMLDivElement>(null)

  // Auto-sync cookie on first load when no property was previously selected
  useEffect(() => {
    if (!cookieSet && activePropertyId) {
      fetch('/api/auth/select-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: activePropertyId }),
      }).then(() => router.refresh())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
      if (propRef.current && !propRef.current.contains(e.target as Node)) setPropOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const changeLanguage = async (lang: string) => {
    setLangOpen(false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    router.refresh()
  }

  const selectProperty = async (property_id: string | null) => {
    setPropOpen(false)
    await fetch('/api/auth/select-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id }),
    })
    window.location.reload()
  }

  const activeProperty = properties.find(p => p.id === activePropertyId)
  const showPropertySwitcher = properties.length > 1

  return (
    <header className="hidden lg:flex h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {showPropertySwitcher ? (
          <div ref={propRef} className="relative">
            <button
              onClick={() => setPropOpen(v => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
                propOpen
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  {activeProperty?.name ?? orgName}
                </p>
                {activeProperty?.address && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight max-w-48">
                    {activeProperty.address}
                  </p>
                )}
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500 transition-transform', propOpen && 'rotate-180')} />
            </button>

            {propOpen && (
              <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 w-72 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Switch Property</p>
                </div>
                <div className="p-1.5 flex flex-col gap-0.5">
                  {properties.map(p => {
                    const isActive = activePropertyId === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectProperty(p.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isActive ? 'bg-black dark:bg-white' : 'bg-gray-100 dark:bg-gray-700'
                        )}>
                          <MapPin className={cn('w-3.5 h-3.5', isActive ? 'text-white dark:text-black' : 'text-gray-400 dark:text-gray-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold truncate', isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>
                            {p.name}
                          </p>
                          {p.address ? (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight">{p.address}</p>
                          ) : (
                            <p className="text-[11px] text-gray-300 dark:text-gray-600 leading-tight">No address set</p>
                          )}
                        </div>
                        {isActive && <Check className="w-4 h-4 text-black dark:text-white shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">{orgName}</p>
              {activeProperty?.address && (
                <p className="text-[11px] text-gray-400 truncate leading-tight">{activeProperty.address}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">{language}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-35 z-50">
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => changeLanguage(code)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-200"
                >
                  {label}
                  {language === code && <Check className="w-3.5 h-3.5 text-black dark:text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.logout')}</span>
        </button>
      </div>
    </header>
  )
}
