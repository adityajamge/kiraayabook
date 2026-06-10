import { db } from '@/lib/db'
import { tenants, rooms } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and, count } from 'drizzle-orm'
import { ensureRentRecordsUpToDate } from '@/lib/rent'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const room_id = searchParams.get('room_id')
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  const conditions = [eq(tenants.org_id, org_id)]
  if (room_id)     conditions.push(eq(tenants.room_id, room_id))
  if (property_id) conditions.push(eq(tenants.property_id, property_id))

  const [countRows, rows] = await Promise.all([
    db.select({ total: count() }).from(tenants).where(and(...conditions)),
    db.select().from(tenants).where(and(...conditions)).orderBy(tenants.created_at).limit(limit).offset(offset),
  ])

  return Response.json({ data: rows, total: countRows[0].total, limit, offset })
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

  const [[room], [existing]] = await Promise.all([
    db.select({ property_id: rooms.property_id })
      .from(rooms)
      .where(and(eq(rooms.id, room_id), eq(rooms.org_id, org_id))),
    db.select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.org_id, org_id), eq(tenants.phone, phone))),
  ])

  if (!room) return Response.json({ error: 'Room not found.' }, { status: 404 })
  if (existing) return Response.json({ error: 'A tenant with this phone number already exists.' }, { status: 409 })

  const [tenant] = await db
    .insert(tenants)
    .values({
      org_id,
      property_id:   room.property_id,
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

  // Fire-and-forget — generate first rent cycle immediately
  if (tenant.rent_amount) {
    ensureRentRecordsUpToDate(org_id, room.property_id, {
      id:           tenant.id,
      move_in_date: tenant.move_in_date,
      rent_amount:  tenant.rent_amount,
      property_id:  tenant.property_id,
    }).catch(() => { /* non-fatal */ })
  }

  return Response.json(tenant, { status: 201 })
}
