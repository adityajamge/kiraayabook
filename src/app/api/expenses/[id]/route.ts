import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { and, eq } from 'drizzle-orm'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const org_id = await getOrgId(request)
  const { id } = await params
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.org_id, org_id)))
  return new Response(null, { status: 204 })
}
