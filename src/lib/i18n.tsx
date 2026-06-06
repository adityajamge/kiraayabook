'use client'

import { createContext, useContext } from 'react'

type Messages = Record<string, unknown>

const LangContext = createContext<Messages | null>(null)

export function LanguageProvider({ messages, children }: { messages: Messages; children: React.ReactNode }) {
  return <LangContext.Provider value={messages}>{children}</LangContext.Provider>
}

export function useT() {
  const messages = useContext(LangContext)

  return function t(key: string, vars?: Record<string, string | number>): string {
    const val = key.split('.').reduce((obj: unknown, k) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k]
      return undefined
    }, messages ?? {})

    const str = typeof val === 'string' ? val : key
    if (!vars) return str
    return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
  }
}
