import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getAuthContext, withAuth} from '@/lib/middleware'
import { and, eq, ne } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const PATCH = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { org_id, role } = await getAuthContext(request)
  if (role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { name, email, password, staff_role, property_id } = await request.json()

  if (!name?.trim() || !email?.trim()) {
    return Response.json({ error: 'name and email are required' }, { status: 400 })
  }

  if (!['manager', 'staff'].includes(staff_role)) {
    return Response.json({ error: 'role must be manager or staff' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    name:        name.trim(),
    email:       email.trim().toLowerCase(),
    role:        staff_role,
    property_id: property_id || null,
  }

  if (password) {
    updateData.password_hash = await bcrypt.hash(password, 12)
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, id), eq(users.org_id, org_id), ne(users.role, 'owner')))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, property_id: users.property_id, created_at: users.created_at })

  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(user)
})

export const DELETE = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { org_id, role } = await getAuthContext(request)
  if (role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const [user] = await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.org_id, org_id), ne(users.role, 'owner')))
    .returning()

  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
})
