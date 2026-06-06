import { verifyJwt, type JwtPayload } from '@/lib/auth'

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}

function getCookieValue(header: string, name: string): string | null {
  if (!header) return null
  const parts = header.split(';')
  for (const part of parts) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key === name) return valueParts.join('=')
  }
  return null
}

async function getJwtPayload(req: Request): Promise<JwtPayload | null> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const token = getCookieValue(cookieHeader, 'kiraayabook_token')
  if (!token) return null
  return verifyJwt(token)
}

export async function getOrgId(req: Request): Promise<string> {
  const org_id = req.headers.get('x-org-id')
  if (org_id) return org_id

  const payload = await getJwtPayload(req)
  if (!payload) throw unauthorized()
  return payload.org_id
}

export function getPropertyId(req: Request): string | null {
  return req.headers.get('x-property-id')
}

export async function getAuthContext(req: Request): Promise<JwtPayload> {
  const org_id = req.headers.get('x-org-id')
  const user_id = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role')
  if (org_id && user_id && role) {
    return { org_id, user_id, role, property_id: req.headers.get('x-property-id') }
  }

  const payload = await getJwtPayload(req)
  if (!payload) throw unauthorized()
  return payload
}
