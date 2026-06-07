import { db } from '@/lib/db'
import { rooms } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params

  const [room] = await db
    .select()
    .from(rooms)
    .where(and(
      eq(rooms.id, id),
      eq(rooms.org_id, org_id),
      ...(property_id ? [eq(rooms.property_id, property_id)] : []),
    ))

  if (!room) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(room)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params
  const body = await request.json()

  const patch: Partial<typeof rooms.$inferInsert> = {}
  if (body.room_number !== undefined) patch.room_number = body.room_number
  if (body.capacity    !== undefined) patch.capacity    = Number(body.capacity)
  if (body.floor       !== undefined) patch.floor       = body.floor || undefined
  if (body.type        !== undefined) patch.type        = body.type  || undefined

  const [room] = await db
    .update(rooms)
    .set(patch)
    .where(and(
      eq(rooms.id, id),
      eq(rooms.org_id, org_id),
      ...(property_id ? [eq(rooms.property_id, property_id)] : []),
    ))
    .returning()

  if (!room) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(room)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { id } = await params

  const [room] = await db
    .delete(rooms)
    .where(and(
      eq(rooms.id, id),
      eq(rooms.org_id, org_id),
      ...(property_id ? [eq(rooms.property_id, property_id)] : []),
    ))
    .returning()

  if (!room) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
