import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and, desc, count } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  const conditions = [eq(expenses.org_id, org_id)]
  if (property_id) conditions.push(eq(expenses.property_id, property_id))

  const [countRows, rows] = await Promise.all([
    db.select({ total: count() }).from(expenses).where(and(...conditions)),
    db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date), desc(expenses.created_at)).limit(limit).offset(offset),
  ])

  return Response.json({ data: rows, total: countRows[0].total, limit, offset })
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  if (!property_id)
    return Response.json({ error: 'property_id is required' }, { status: 400 })
  const { description, amount, date } = await request.json()
  if (!description || !amount || !date)
    return Response.json({ error: 'description, amount and date are required' }, { status: 400 })
  const [row] = await db
    .insert(expenses)
    .values({ org_id, property_id, description, amount: Number(amount), date })
    .returning()
  return Response.json(row, { status: 201 })
}
