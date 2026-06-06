import { db } from '@/lib/db'
import { rent_records, tenants } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  const propertyFilter = property_id ? sql` AND property_id = ${property_id}` : sql``

  if (month) {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid')::int    AS paid_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::int    AS collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount
      FROM rent_records
      WHERE org_id = ${org_id} AND TO_CHAR(due_date, 'YYYY-MM') = ${month} ${propertyFilter}
    `)
    const rows = Array.isArray(result) ? result : result?.rows ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Response.json((rows as any)[0])
  }

  const tenant_id = searchParams.get('tenant_id')

  const conditions = [eq(rent_records.org_id, org_id)]
  if (tenant_id) conditions.push(eq(rent_records.tenant_id, tenant_id))
  if (property_id) conditions.push(eq(rent_records.property_id, property_id))

  const rows = await db
    .select()
    .from(rent_records)
    .where(and(...conditions))
    .orderBy(rent_records.due_date)

  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const body = await request.json()

  const { tenant_id, amount, period_start, period_end, due_date, payment_mode } = body

  if (!tenant_id || !amount || !period_start || !period_end || !due_date) {
    return Response.json({ error: 'tenant_id, amount, period_start, period_end, and due_date are required' }, { status: 400 })
  }

  const [tenant] = await db
    .select({ property_id: tenants.property_id })
    .from(tenants)
    .where(and(eq(tenants.id, tenant_id), eq(tenants.org_id, org_id)))

  if (!tenant) return Response.json({ error: 'Tenant not found.' }, { status: 404 })

  const propertyFilter = property_id ? sql` AND property_id = ${property_id}` : sql``

  const maxResult = await db.execute(sql`
    SELECT COALESCE(MAX(bill_no), 0) AS max_bill_no FROM rent_records WHERE org_id = ${org_id} ${propertyFilter}
  `)
  const rows = Array.isArray(maxResult) ? maxResult : (maxResult?.rows ?? [])
  const max_bill_no = Number((rows[0] as Record<string, unknown>)?.max_bill_no ?? 0)

  const [record] = await db
    .insert(rent_records)
    .values({ org_id, property_id: tenant.property_id, tenant_id, amount, period_start, period_end, due_date, payment_mode, bill_no: max_bill_no + 1 })
    .returning()

  return Response.json(record, { status: 201 })
}
