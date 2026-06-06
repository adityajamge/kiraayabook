import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)

  const conditions = [eq(expenses.org_id, org_id)]
  if (property_id) conditions.push(eq(expenses.property_id, property_id))

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.date), desc(expenses.created_at))
  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { description, amount, date } = await request.json()
  if (!description || !amount || !date)
    return Response.json({ error: 'description, amount and date are required' }, { status: 400 })
  const [row] = await db
    .insert(expenses)
    .values({ org_id, property_id: property_id || null, description, amount: Number(amount), date })
    .returning()
  return Response.json(row, { status: 201 })
}
