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
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
