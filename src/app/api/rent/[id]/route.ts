import { db } from '@/lib/db'
import { rent_records } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const { id } = await params
  const body = await request.json()

  const { payment_mode } = body
  if (payment_mode && !['cash', 'online', 'cheque'].includes(payment_mode)) {
    return Response.json({ error: 'payment_mode must be cash, online, or cheque' }, { status: 400 })
  }
  const today = new Date().toISOString().split('T')[0]

  const [record] = await db
    .update(rent_records)
    .set({
      status: 'paid',
      paid_date: today,
      ...(payment_mode ? { payment_mode } : {}),
    })
    .where(and(eq(rent_records.id, id), eq(rent_records.org_id, org_id)))
    .returning()

  if (!record) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(record)
}
