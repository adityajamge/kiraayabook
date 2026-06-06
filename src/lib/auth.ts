import { SignJWT, jwtVerify } from 'jose'

export interface JwtPayload {
  user_id: string
  org_id: string
  role: string
  property_id?: string | null
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}
