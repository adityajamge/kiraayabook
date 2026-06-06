import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { BottomNav } from '@/components/bottom-nav'
import { DarkModeInit } from '@/components/dark-mode-init'
import { Toaster } from '@/components/ui/sonner'
import { verifyJwt } from '@/lib/auth'
import { LanguageProvider } from '@/lib/i18n'
import enMessages from '@/messages/en.json'
import mrMessages from '@/messages/mr.json'
import hiMessages from '@/messages/hi.json'
import type { Metadata } from 'next'

type OrgData = {
  name: string
  logo_url: string | null
  dark_mode: boolean
  language: string
}

const allMessages: Record<string, typeof enMessages> = {
  en: enMessages,
  mr: mrMessages,
  hi: hiMessages,
}

async function getOrgData(): Promise<OrgData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('kiraayabook_token')?.value
  if (!token) return null
  const payload = await verifyJwt(token)
  if (!payload) return null
  const [org] = await db
    .select({ name: organisations.name, logo_url: organisations.logo_url, dark_mode: organisations.dark_mode, language: organisations.language })
    .from(organisations)
    .where(eq(organisations.id, payload.org_id))
  return org ?? null
}

export async function generateMetadata(): Promise<Metadata> {
  const org = await getOrgData()
  return { title: org?.name ?? 'Dashboard' }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('kiraayabook_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')

  const org = await getOrgData()
  const orgName = org?.name ?? 'Your PG'
  const logoUrl = org?.logo_url ?? null
  const darkMode = org?.dark_mode ?? false
  const language = org?.language ?? 'en'
  const messages = allMessages[language] ?? enMessages

  return (
    <LanguageProvider messages={messages}>
      <div className="flex h-screen overflow-hidden">
        <DarkModeInit dark={darkMode} />
        <Sidebar orgName={orgName} logoUrl={logoUrl} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader orgName={orgName} language={language} />
          <main className="flex-1 overflow-auto bg-white dark:bg-gray-950 lg:bg-gray-50 p-4 lg:p-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>
        <BottomNav language={language} />
        <Toaster />
      </div>
    </LanguageProvider>
  )
}
