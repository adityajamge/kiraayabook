import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'
import { db } from '@/lib/db'
import { properties } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function proxy(request: NextRequest) {
  // Strip all client-supplied auth headers unconditionally — this proxy is the
  // sole authority. Without this, an unauthenticated request carrying spoofed
  // x-org-id / x-user-id / x-user-role headers bypasses every auth check.
  const headers = new Headers(request.headers)
  headers.delete('x-org-id')
  headers.delete('x-user-id')
  headers.delete('x-user-role')
  headers.delete('x-property-id')
  headers.delete('x-pathname')

  const token = request.cookies.get('kiraayabook_token')?.value
  if (!token) return NextResponse.next({ request: { headers } })

  const payload = await verifyJwt(token)
  if (!payload) {
    // Invalid / expired token — clear cookies and redirect dashboard routes to login
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('kiraayabook_token')
      response.cookies.delete('kiraayabook_property')
      return response
    }
    return NextResponse.next({ request: { headers } })
  }

  headers.set('x-org-id', payload.org_id)
  headers.set('x-user-id', payload.user_id)
  headers.set('x-user-role', payload.role)
  headers.set('x-pathname', request.nextUrl.pathname)

  // Owner: use the property selected via cookie; staff: use property locked in JWT
  if (payload.role === 'owner') {
    let propertyId = request.cookies.get('kiraayabook_property')?.value ?? null
    if (!propertyId) {
      try {
        const [first] = await db
          .select({ id: properties.id })
          .from(properties)
          .where(eq(properties.org_id, payload.org_id))
          .orderBy(properties.created_at)
          .limit(1)
        propertyId = first?.id ?? null
      } catch {
        // DB unavailable (cold start / timeout) — skip fallback, cookie-based
        // sync in DashboardHeader will set the cookie on next render
      }
    }
    if (propertyId) headers.set('x-property-id', propertyId)
  } else if (payload.property_id) {
    headers.set('x-property-id', payload.property_id)
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
