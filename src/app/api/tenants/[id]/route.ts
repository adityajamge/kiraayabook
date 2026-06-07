import { db } from '@/lib/db'
import { tenants, rooms } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params
  const body = await request.json()
  const normalized: Record<string, unknown> = {
    ...body,
    email:         body.email || undefined,
    cot_number:    body.cot_number || undefined,
    move_out_date: body.move_out_date || undefined,
    rent_amount:   body.rent_amount ? Number(body.rent_amount) : undefined,
  }

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
  return Response.json(tenant)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
