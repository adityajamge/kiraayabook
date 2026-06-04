import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const domain = host.split(':')[0]

  const [org] = await db
    .select({ name: organisations.name, logo_url: organisations.logo_url })
    .from(organisations)
    .where(eq(organisations.domain, domain))
    .limit(1)

  if (!org) return NextResponse.json({ name: null, logo_url: null })
  return NextResponse.json(org)
}
