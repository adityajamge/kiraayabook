'use client'

import { useEffect } from 'react'

export function DarkModeInit({ dark }: { dark: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  return null
}
