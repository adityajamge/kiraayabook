import { db } from '@/lib/db'
import { users, properties } from '@/lib/db/schema'
import { getAuthContext, withAuth} from '@/lib/middleware'
import { and, eq, ne } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const GET = withAuth(async (request: Request) => {
  const { org_id, role } = await getAuthContext(request)

  if (role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id:          users.id,
      name:        users.name,
      email:       users.email,
      role:        users.role,
      property_id: users.property_id,
      created_at:  users.created_at,
      property_name: properties.name,
    })
    .from(users)
    .leftJoin(properties, eq(users.property_id, properties.id))
    .where(and(eq(users.org_id, org_id), ne(users.role, 'owner')))
    .orderBy(users.created_at)

  return Response.json(rows)
})

export const POST = withAuth(async (request: Request) => {
  const { org_id, role } = await getAuthContext(request)

  if (role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, password, staff_role, property_id } = await request.json()

  if (!name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: 'name, email, and password are required' }, { status: 400 })
  }

  if (!['manager', 'staff'].includes(staff_role)) {
    return Response.json({ error: 'role must be manager or staff' }, { status: 400 })
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.trim().toLowerCase()))
  if (existing) {
    return Response.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  const [user] = await db
    .insert(users)
    .values({
      org_id,
      name:          name.trim(),
      email:         email.trim().toLowerCase(),
      password_hash: hash,
      role:          staff_role,
      property_id:   property_id || null,
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, property_id: users.property_id, created_at: users.created_at })

  return Response.json(user, { status: 201 })
})
