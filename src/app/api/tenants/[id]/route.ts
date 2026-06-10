import { db } from '@/lib/db'
import { tenants, rooms } from '@/lib/db/schema'
import { getOrgId, getPropertyId, withAuth} from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'
import { ensureRentRecordsUpToDate, deletePendingRecords } from '@/lib/rent'

export const GET = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(
      eq(tenants.id, id),
      eq(tenants.org_id, org_id),
      ...(property_id ? [eq(tenants.property_id, property_id)] : []),
    ))

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(tenant)
})

export const PATCH = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params
  const body = await request.json()

  // Fetch current tenant to detect move_in_date change
  const [existing] = await db
    .select({ move_in_date: tenants.move_in_date, rent_amount: tenants.rent_amount, property_id: tenants.property_id })
    .from(tenants)
    .where(and(
      eq(tenants.id, id),
      eq(tenants.org_id, org_id),
      ...(property_id ? [eq(tenants.property_id, property_id)] : []),
    ))

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const VALID_STATUSES = ['active', 'inactive']
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: 'status must be active or inactive' }, { status: 400 })
  }
  if (body.move_in_date !== undefined && !ISO_DATE.test(body.move_in_date)) {
    return Response.json({ error: 'move_in_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (body.move_out_date !== undefined && body.move_out_date !== null && !ISO_DATE.test(body.move_out_date)) {
    return Response.json({ error: 'move_out_date must be YYYY-MM-DD' }, { status: 400 })
  }

  const normalized: Partial<typeof tenants.$inferInsert> = {}
  if (body.name          !== undefined) normalized.name          = body.name
  if (body.phone         !== undefined) normalized.phone         = body.phone
  if (body.email         !== undefined) normalized.email         = body.email         || undefined
  if (body.cot_number    !== undefined) normalized.cot_number    = body.cot_number    || undefined
  if (body.move_in_date  !== undefined) normalized.move_in_date  = body.move_in_date
  if (body.move_out_date !== undefined) normalized.move_out_date = body.move_out_date || undefined
  if (body.status        !== undefined) normalized.status        = body.status
  if (body.rent_amount   !== undefined) normalized.rent_amount   = body.rent_amount ? Number(body.rent_amount) : undefined
  if (body.room_id       !== undefined) normalized.room_id       = body.room_id

  if (body.room_id) {
    const [room] = await db
      .select({ property_id: rooms.property_id })
      .from(rooms)
      .where(and(eq(rooms.id, body.room_id), eq(rooms.org_id, org_id)))

    if (!room) return Response.json({ error: 'Room not found.' }, { status: 404 })
    normalized.property_id = room.property_id
  }

  const [tenant] = await db
    .update(tenants)
    .set(normalized)
    .where(and(
      eq(tenants.id, id),
      eq(tenants.org_id, org_id),
      ...(property_id ? [eq(tenants.property_id, property_id)] : []),
    ))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })

  const moveInChanged = body.move_in_date !== undefined && body.move_in_date !== existing.move_in_date

  if (moveInChanged) {
    // Delete all pending records and regenerate from new move_in_date
    await deletePendingRecords(id, org_id)
    if (tenant.rent_amount) {
      await ensureRentRecordsUpToDate(org_id, tenant.property_id, {
        id:           tenant.id,
        move_in_date: tenant.move_in_date,
        rent_amount:  tenant.rent_amount,
        property_id:  tenant.property_id,
      })
    }
  }

  return Response.json(tenant)
})

export const DELETE = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params

  const [tenant] = await db
    .delete(tenants)
    .where(and(
      eq(tenants.id, id),
      eq(tenants.org_id, org_id),
      ...(property_id ? [eq(tenants.property_id, property_id)] : []),
    ))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
})
