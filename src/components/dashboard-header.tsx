'use client'

import { useRouter } from 'next/navigation'
import { MapPin, LogOut, Globe, Check } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useState, useRef, useEffect } from 'react'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
]

export function DashboardHeader({ orgName, language }: { orgName: string; language: string }) {
  const t = useT()
  const router = useRouter()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
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

  return (
    <header className="hidden lg:flex h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-semibold text-gray-900 dark:text-white">{orgName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language dropdown */}
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
