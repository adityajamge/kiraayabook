import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.org_id, org_id))
    .orderBy(desc(expenses.date), desc(expenses.created_at))
  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const { description, amount, date } = await request.json()
  if (!description || !amount || !date)
    return Response.json({ error: 'description, amount and date are required' }, { status: 400 })
  const [row] = await db
    .insert(expenses)
    .values({ org_id, description, amount: Number(amount), date })
    .returning()
  return Response.json(row, { status: 201 })
}
