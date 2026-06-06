import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('kiraayabook_token')?.value
  if (!token) return NextResponse.next()

  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.next()

  const headers = new Headers(request.headers)
  headers.set('x-org-id', payload.org_id)
  headers.set('x-user-id', payload.user_id)
  headers.set('x-user-role', payload.role)

  // Owner: use the property selected via cookie; staff: use property locked in JWT
  if (payload.role === 'owner') {
    const propertyId = request.cookies.get('kiraayabook_property')?.value
    if (propertyId) headers.set('x-property-id', propertyId)
  } else if (payload.property_id) {
    headers.set('x-property-id', payload.property_id)
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
