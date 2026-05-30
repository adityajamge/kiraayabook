import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = getOrgId(request)
  const { id } = await params

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, id), eq(tenants.org_id, org_id)))

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(tenant)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = getOrgId(request)
  const { id } = await params
  const body = await request.json()

  const [tenant] = await db
    .update(tenants)
    .set(body)
    .where(and(eq(tenants.id, id), eq(tenants.org_id, org_id)))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(tenant)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = getOrgId(request)
  const { id } = await params

  const [tenant] = await db
    .delete(tenants)
    .where(and(eq(tenants.id, id), eq(tenants.org_id, org_id)))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
