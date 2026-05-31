import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
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
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('kiraayabook_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
