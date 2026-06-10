import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { getOrgId, getPropertyId, withAuth} from '@/lib/middleware'
import { and, eq } from 'drizzle-orm'

export const DELETE = withAuth(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params
  const [deleted] = await db
    .delete(expenses)
    .where(and(
      eq(expenses.id, id),
      eq(expenses.org_id, org_id),
      ...(property_id ? [eq(expenses.property_id, property_id)] : []),
    ))
    .returning()
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })
  return new Response(null, { status: 204 })
})
