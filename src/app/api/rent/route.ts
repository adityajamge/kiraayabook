import { db } from '@/lib/db'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)

  const tenant_id = searchParams.get('tenant_id')
  const limit     = Math.min(parseInt(searchParams.get('limit')  ?? '500', 10), 500)
  const offset    = Math.max(parseInt(searchParams.get('offset') ?? '0',   10), 0)

  const propertyFilter = property_id ? sql` AND rr.property_id = ${property_id}` : sql``
  const tenantFilter   = tenant_id   ? sql` AND rr.tenant_id   = ${tenant_id}`   : sql``

  // When fetching for a specific tenant (history tab) return all statuses.
  // Otherwise (Collect Rent tab) return only pending/partial records.
  const statusFilter = tenant_id
    ? sql``
    : sql` AND rr.status IN ('pending', 'partial')`

  const rows = await db.execute(sql`
    SELECT
      rr.id,
      rr.org_id,
      rr.property_id,
      rr.tenant_id,
      rr.amount_due,
      rr.cycle_start,
      rr.cycle_end,
      rr.status,
      rr.bill_no,
      rr.created_at,
      COALESCE(SUM(p.amount), 0)::int  AS amount_paid,
      (rr.amount_due - COALESCE(SUM(p.amount), 0))::int AS balance,
      -- latest payment info for display
      MAX(p.paid_date)::text            AS last_paid_date,
      (array_agg(p.payment_mode ORDER BY p.created_at DESC))[1] AS last_payment_mode
    FROM rent_records rr
    LEFT JOIN payments p ON p.rent_record_id = rr.id
    WHERE rr.org_id = ${org_id}
      ${propertyFilter}
      ${tenantFilter}
      ${statusFilter}
    GROUP BY rr.id
    ORDER BY rr.cycle_start ASC
    LIMIT ${limit} OFFSET ${offset}
  `)

  const data  = Array.isArray(rows) ? rows : rows?.rows ?? []

  // Count query (separate, lightweight)
  const countRows = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM rent_records rr
    WHERE rr.org_id = ${org_id}
      ${propertyFilter}
      ${tenantFilter}
      ${statusFilter}
  `)
  const countData = Array.isArray(countRows) ? countRows : countRows?.rows ?? []
  const total = (countData[0] as { total: number })?.total ?? 0

  return Response.json({ data, total, limit, offset })
}
