import { db } from '@/lib/db'
import { users, properties, login_attempts } from '@/lib/db/schema'
import { signJwt } from '@/lib/auth'
import { eq, and, gte, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_IP_ATTEMPTS    = 10
const IP_WINDOW_MINUTES  = 15
const MAX_EMAIL_ATTEMPTS = 20
const EMAIL_WINDOW_HOURS = 1

// Pre-computed bcrypt hash — normalises response time when user is not found or email is
// locked out, preventing timing-based user enumeration (VULN-12).
const TIMING_DUMMY_HASH = '$2a$12$LIXBzFT4CJGt6W4Z9dVOSuT8UgjHFTh7/XWR5S6Lm9R4J4VqZU3zi'

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const ipWindowStart = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000)

  // ── 1. IP check ────────────────────────────────────────────────────────────
  const [{ ipTotal }] = await db
    .select({ ipTotal: count() })
    .from(login_attempts)
    .where(and(eq(login_attempts.ip, ip), gte(login_attempts.attempted_at, ipWindowStart)))

  if (ipTotal >= MAX_IP_ATTEMPTS) {
    return Response.json(
      { error: `Too many login attempts. Try again in ${IP_WINDOW_MINUTES} minutes.` },
      { status: 429 }
    )
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const emailWindowStart = new Date(Date.now() - EMAIL_WINDOW_HOURS * 60 * 60 * 1000)

  // ── 2. Email check ─────────────────────────────────────────────────────────
  // Returns identical 401 (not 429) so it doesn't reveal whether the account exists or is locked.
  const [{ emailTotal }] = await db
    .select({ emailTotal: count() })
    .from(login_attempts)
    .where(and(eq(login_attempts.email, normalizedEmail), gte(login_attempts.attempted_at, emailWindowStart)))

  if (emailTotal >= MAX_EMAIL_ATTEMPTS) {
    await bcrypt.compare(password, TIMING_DUMMY_HASH)
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // ── 3. Credential check ────────────────────────────────────────────────────
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail))

  if (!user) {
    await bcrypt.compare(password, TIMING_DUMMY_HASH)
    await db.insert(login_attempts).values({ ip, email: normalizedEmail })
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    await db.insert(login_attempts).values({ ip, email: normalizedEmail })
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // ── 4. Success ─────────────────────────────────────────────────────────────
  // Clear attempts for this email only. IP rows expire naturally via the 15-minute window.
  db.delete(login_attempts)
    .where(eq(login_attempts.email, normalizedEmail))
    .catch(() => {})

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
