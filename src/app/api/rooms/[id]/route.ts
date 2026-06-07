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

  const [room] = await db
    .update(rooms)
    .set(body)
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
