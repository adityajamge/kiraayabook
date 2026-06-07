import { db } from '@/lib/db'
import { users, properties } from '@/lib/db/schema'
import { signJwt } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signJwt({
    user_id: user.id,
    org_id: user.org_id,
    role: user.role,
    property_id: user.property_id,
  })

  const response = NextResponse.json({ ok: true })

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  }

  response.cookies.set('kiraayabook_token', token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  })

  // For owners: pre-set the property cookie so proxy.ts never needs to query the DB
  // on subsequent requests. Staff already have property_id locked in their JWT.
  if (user.role === 'owner') {
    const [firstProp] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.org_id, user.org_id))
      .orderBy(properties.created_at)
      .limit(1)

    if (firstProp) {
      response.cookies.set('kiraayabook_property', firstProp.id, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      })
    }
  }

  return response
}
