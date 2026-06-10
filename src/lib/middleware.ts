import { verifyJwt, type JwtPayload } from '@/lib/auth'

export class AuthError extends Error {
  readonly response: Response
  constructor() {
    super('Unauthorized')
    this.response = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
}

// Wraps a route handler so that AuthError thrown by getOrgId / getAuthContext
// becomes a proper 401 response instead of an unhandled 500.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<T extends (request: Request, ...args: any[]) => Promise<Response>>(handler: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (request: Request, ...args: any[]) => {
    try {
      return await handler(request, ...args)
    } catch (e) {
      if (e instanceof AuthError) return e.response
      throw e
    }
  }) as T
}

function unauthorized(): never {
  throw new AuthError()
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
  // Never trust x-org-id from request headers. In Next.js 16 Node.js runtime,
  // NextResponse.next({ request: { headers } }) does not strip client-supplied
  // headers — an attacker can forge x-org-id to bypass auth. Always verify JWT.
  const payload = await getJwtPayload(req)
  if (!payload) throw unauthorized()
  return payload.org_id
}

export function getPropertyId(req: Request): string | null {
  // property_id is only a filter within an already-verified org, so reading
  // it from the proxy-injected header is acceptable. Fall back to the cookie
  // (set by select-property or login) when the header is absent.
  const fromHeader = req.headers.get('x-property-id')
  if (fromHeader) return fromHeader
  const cookieHeader = req.headers.get('cookie') ?? ''
  return getCookieValue(cookieHeader, 'kiraayabook_property')
}

export async function getAuthContext(req: Request): Promise<JwtPayload> {
  // Never trust x-user-id / x-user-role from request headers for the same
  // reason as getOrgId — always verify the JWT from the cookie.
  const payload = await getJwtPayload(req)
  if (!payload) throw unauthorized()
  return payload
}
