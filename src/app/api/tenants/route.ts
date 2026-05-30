import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = getOrgId(request)

  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.org_id, org_id))
    .orderBy(tenants.created_at)

  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = getOrgId(request)
  const body = await request.json()

  const { room_id, name, phone, email, cot_number, move_in_date, move_out_date } = body

  if (!room_id || !name || !phone || !move_in_date) {
    return Response.json({ error: 'room_id, name, phone, and move_in_date are required' }, { status: 400 })
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ org_id, room_id, name, phone, email, cot_number, move_in_date, move_out_date })
    .returning()

  return Response.json(tenant, { status: 201 })
}
