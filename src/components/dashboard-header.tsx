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

type PropertyItem = { id: string; name: string }

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
    router.refresh()
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
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-semibold text-gray-900 dark:text-white">{orgName}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
            </button>
            {propOpen && (
              <div className="absolute left-0 top-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-48 z-50">
                {properties.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectProperty(p.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-200"
                  >
                    <span className="truncate">{p.name}</span>
                    {activePropertyId === p.id && <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-semibold text-gray-900 dark:text-white">{orgName}</span>
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
