import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
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
  const org_id = await getOrgId(request)
  const { id } = await params
  const body = await request.json()
  const normalized = {
    ...body,
    email: body.email || undefined,
    cot_number: body.cot_number || undefined,
    move_out_date: body.move_out_date || undefined,
  }

  const [tenant] = await db
    .update(tenants)
    .set(normalized)
    .where(and(eq(tenants.id, id), eq(tenants.org_id, org_id)))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(tenant)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org_id = await getOrgId(request)
  const { id } = await params

  const [tenant] = await db
    .delete(tenants)
    .where(and(eq(tenants.id, id), eq(tenants.org_id, org_id)))
    .returning()

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
