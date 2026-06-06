import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const room_id = searchParams.get('room_id')

  const conditions = [eq(tenants.org_id, org_id)]
  if (room_id) conditions.push(eq(tenants.room_id, room_id))
  if (property_id) conditions.push(eq(tenants.property_id, property_id))

  const rows = await db
    .select()
    .from(tenants)
    .where(and(...conditions))
    .orderBy(tenants.created_at)

  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const body = await request.json()

  const { room_id, name, phone, email, cot_number, move_in_date, move_out_date, rent_amount } = body

  if (!room_id || !name || !phone || !move_in_date) {
    return Response.json({ error: 'room_id, name, phone, and move_in_date are required' }, { status: 400 })
  }

  if (!/^\d{10}$/.test(phone)) {
    return Response.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.org_id, org_id), eq(tenants.phone, phone)))

  if (existing) {
    return Response.json({ error: 'A tenant with this phone number already exists.' }, { status: 409 })
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      org_id,
      property_id:   property_id || null,
      room_id,
      name,
      phone,
      email:         email || undefined,
      cot_number:    cot_number || undefined,
      move_in_date,
      move_out_date: move_out_date || undefined,
      rent_amount:   rent_amount ? Number(rent_amount) : undefined,
    })
    .returning()

  return Response.json(tenant, { status: 201 })
}
