import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth routes are public — no token needed
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('kiraayabook_token')?.value

  // Unauthenticated request to a dashboard page → redirect to login
  if (pathname.startsWith('/dashboard')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const payload = await verifyJwt(token)
    if (!payload) return NextResponse.redirect(new URL('/login', request.url))

    const headers = new Headers(request.headers)
    headers.set('x-org-id', payload.org_id)
    headers.set('x-user-id', payload.user_id)
    headers.set('x-user-role', payload.role)
    return NextResponse.next({ request: { headers } })
  }

  // Unauthenticated request to a protected API route → 401
  if (pathname.startsWith('/api/')) {
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyJwt(token)
    if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const headers = new Headers(request.headers)
    headers.set('x-org-id', payload.org_id)
    headers.set('x-user-id', payload.user_id)
    headers.set('x-user-role', payload.role)
    return NextResponse.next({ request: { headers } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
