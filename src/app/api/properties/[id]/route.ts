import { db } from '@/lib/db'
import { properties } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { and, eq } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const { id } = await params
  const { name, address, phone } = await request.json()

  if (!name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const [property] = await db
    .update(properties)
    .set({ name: name.trim(), address: address || null, phone: phone || null })
    .where(and(eq(properties.id, id), eq(properties.org_id, org_id)))
    .returning()

  if (!property) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(property)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const { id } = await params

  const [property] = await db
    .delete(properties)
    .where(and(eq(properties.id, id), eq(properties.org_id, org_id)))
    .returning()

  if (!property) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
