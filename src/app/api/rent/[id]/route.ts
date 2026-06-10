import { db } from '@/lib/db'
import { payments } from '@/lib/db/schema'
import { getOrgId, getPropertyId, withAuth } from '@/lib/middleware'
import { eq, and, sql } from 'drizzle-orm'
import { recomputeStatus } from '@/lib/rent'

/**
 * GET /api/rent/[id] — fetch a single rent record with payment summary.
 */
export const GET = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params

  const propertyFilter = property_id ? sql` AND rr.property_id = ${property_id}` : sql``

  const rows = await db.execute(sql`
    SELECT
      rr.*,
      COALESCE(SUM(p.amount), 0)::int AS amount_paid,
      (rr.amount_due - COALESCE(SUM(p.amount), 0))::int AS balance
    FROM rent_records rr
    LEFT JOIN payments p ON p.rent_record_id = rr.id
    WHERE rr.id = ${id} AND rr.org_id = ${org_id} ${propertyFilter}
    GROUP BY rr.id
  `)
  const data = Array.isArray(rows) ? rows : rows?.rows ?? []
  if (!data[0]) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data[0])
})

export const DELETE = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  // DELETE a payment: body must include payment_id
  const org_id      = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id: rent_record_id } = await params
  const { payment_id } = await request.json().catch(() => ({}))

  if (!payment_id) {
    return Response.json({ error: 'payment_id is required' }, { status: 400 })
  }

  const [deleted] = await db
    .delete(payments)
    .where(and(
      eq(payments.id, payment_id),
      eq(payments.rent_record_id, rent_record_id),
      eq(payments.org_id, org_id),
      ...(property_id ? [eq(payments.property_id, property_id)] : []),
    ))
    .returning()

  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })

  const status = await recomputeStatus(rent_record_id, org_id)
  return Response.json({ ok: true, status })
})
