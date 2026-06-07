import { db } from '@/lib/db'
import { organisations, users } from '@/lib/db/schema'
import { getAuthContext } from '@/lib/middleware'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  const { org_id, user_id } = await getAuthContext(request)

  const [[org], [user]] = await Promise.all([
    db.select({ id: organisations.id, name: organisations.name, plan: organisations.plan })
      .from(organisations)
      .where(eq(organisations.id, org_id)),
    db.select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, user_id)),
  ])

  if (!org || !user) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ ...user, org_id, org_name: org.name, plan: org.plan })
}
