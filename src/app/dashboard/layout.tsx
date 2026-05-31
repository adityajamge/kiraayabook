import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { BottomNav } from '@/components/bottom-nav'
import { verifyJwt } from '@/lib/auth'
import type { Metadata } from 'next'

async function getOrgName(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('kiraayabook_token')?.value
  if (!token) return 'PG Management'
  const payload = await verifyJwt(token)
  if (!payload) return 'PG Management'
  const [org] = await db
    .select({ name: organisations.name })
    .from(organisations)
    .where(eq(organisations.id, payload.org_id))
  return org?.name ?? 'Your PG'
}

export async function generateMetadata(): Promise<Metadata> {
  const orgName = await getOrgName()
  return { title: orgName }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('kiraayabook_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')

  const orgName = await getOrgName()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgName={orgName} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader orgName={orgName} />
        <main className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
