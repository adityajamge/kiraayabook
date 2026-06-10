import { db } from '@/lib/db'
import { payments, rent_records } from '@/lib/db/schema'
import { getOrgId, getPropertyId, withAuth} from '@/lib/middleware'
import { eq, and, sql } from 'drizzle-orm'
import { recomputeStatus } from '@/lib/rent'

export const POST = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const body = await request.json()

  const { rent_record_id, amount, paid_date, payment_mode, note } = body

  if (!rent_record_id || !amount || !paid_date) {
    return Response.json({ error: 'rent_record_id, amount, and paid_date are required' }, { status: 400 })
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return Response.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paid_date)) {
    return Response.json({ error: 'paid_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (payment_mode && !['cash', 'online', 'cheque'].includes(payment_mode)) {
    return Response.json({ error: 'payment_mode must be cash, online, or cheque' }, { status: 400 })
  }

  // Verify rent record belongs to this org and fetch balance
  const propertyFilter = property_id ? sql` AND rr.property_id = ${property_id}` : sql``
  const result = await db.execute(sql`
    SELECT
      rr.id,
      rr.amount_due,
      rr.tenant_id,
      rr.property_id,
      COALESCE(SUM(p.amount), 0)::int AS amount_paid
    FROM rent_records rr
    LEFT JOIN payments p ON p.rent_record_id = rr.id
    WHERE rr.id = ${rent_record_id} AND rr.org_id = ${org_id} ${propertyFilter}
    GROUP BY rr.id
  `)
  const rows = Array.isArray(result) ? result : result?.rows ?? []
  const record = rows[0] as { id: string; amount_due: number; tenant_id: string; property_id: string; amount_paid: number } | undefined

  if (!record) {
    return Response.json({ error: 'Rent record not found' }, { status: 404 })
  }

  const balance = record.amount_due - record.amount_paid
  if (amount > balance) {
    return Response.json({
      error: `Amount exceeds remaining balance of ₹${balance}`,
      balance,
    }, { status: 422 })
  }

  const [payment] = await db
    .insert(payments)
    .values({
      org_id,
      property_id:    record.property_id,
      tenant_id:      record.tenant_id,
      rent_record_id,
      amount,
      paid_date,
      payment_mode:   payment_mode || null,
      note:           note || null,
    })
    .returning()

  const status = await recomputeStatus(rent_record_id, org_id)

  return Response.json({ payment, status }, { status: 201 })
})

export const GET = withAuth(async (request: Request) => {
  const org_id      = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const rent_record_id = searchParams.get('rent_record_id')
  const tenant_id      = searchParams.get('tenant_id')

  if (!rent_record_id && !tenant_id) {
    return Response.json({ error: 'rent_record_id or tenant_id is required' }, { status: 400 })
  }

  const conditions = [eq(payments.org_id, org_id)]
  if (property_id)    conditions.push(eq(payments.property_id, property_id))
  if (rent_record_id) conditions.push(eq(payments.rent_record_id, rent_record_id))
  if (tenant_id)      conditions.push(eq(payments.tenant_id, tenant_id))

  const rows = await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(payments.paid_date)

  return Response.json(rows)
})
