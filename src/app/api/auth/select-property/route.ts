import { NextResponse } from 'next/server'
import { getAuthContext, withAuth} from '@/lib/middleware'
import { db } from '@/lib/db'
import { properties } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export const POST = withAuth(async (request: Request) => {
  const { org_id, role } = await getAuthContext(request)

  if (role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { property_id } = await request.json()

  if (property_id) {
    const [prop] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.id, property_id), eq(properties.org_id, org_id)))

    if (!prop) return Response.json({ error: 'Property not found' }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true })

  if (property_id) {
    response.cookies.set('kiraayabook_property', property_id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    response.cookies.delete('kiraayabook_property')
  }

  return response
})
