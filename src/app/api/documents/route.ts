import { db } from '@/lib/db'
import { documents, organisations } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'

async function refreshAccessToken(orgId: string, refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  const data = await res.json() as { access_token: string; expires_in: number; error?: string }
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`)

  const expiry = new Date(Date.now() + data.expires_in * 1000)
  await db.update(organisations)
    .set({ google_access_token: data.access_token, google_token_expiry: expiry })
    .where(eq(organisations.id, orgId))

  return data.access_token
}

async function uploadToDrive(accessToken: string, folderId: string, file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const boundary = '-------KiraayaBook314159265358979'
  const metadata = JSON.stringify({ name: file.name || 'document', parents: [folderId] })

  const enc = new TextEncoder()
  const parts: Uint8Array[] = [
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    enc.encode(`--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`),
    new Uint8Array(bytes),
    enc.encode(`\r\n--${boundary}--`),
  ]

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
  const body = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) { body.set(part, offset); offset += part.length }

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body.buffer as ArrayBuffer,
    }
  )

  const data = await res.json() as { id: string; error?: { message: string } }
  if (data.error) throw new Error(`Drive upload failed: ${data.error.message}`)

  return `https://drive.google.com/file/d/${data.id}/view`
}

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')

  const condition = tenant_id
    ? and(eq(documents.org_id, org_id), eq(documents.tenant_id, tenant_id))
    : eq(documents.org_id, org_id)

  const rows = await db.select().from(documents).where(condition)
  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)

  const [org] = await db
    .select({
      id:                     organisations.id,
      google_client_id:       organisations.google_client_id,
      google_client_secret:   organisations.google_client_secret,
      google_access_token:    organisations.google_access_token,
      google_refresh_token:   organisations.google_refresh_token,
      google_token_expiry:    organisations.google_token_expiry,
      google_drive_folder_id: organisations.google_drive_folder_id,
    })
    .from(organisations)
    .where(eq(organisations.id, org_id))

  if (!org.google_drive_folder_id || !org.google_refresh_token || !org.google_client_id || !org.google_client_secret) {
    return Response.json(
      { error: 'Google Drive is not connected. Run pnpm add:drive to set it up.' },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const file      = formData.get('file')      as File   | null
  const tenant_id = formData.get('tenant_id') as string | null
  const doc_type  = formData.get('doc_type')  as string | null

  if (!file || !tenant_id || !doc_type) {
    return Response.json({ error: 'file, tenant_id, and doc_type are required' }, { status: 400 })
  }

  const needsRefresh = !org.google_token_expiry || org.google_token_expiry <= new Date()
  const accessToken  = needsRefresh
    ? await refreshAccessToken(org.id, org.google_refresh_token, org.google_client_id, org.google_client_secret)
    : org.google_access_token!

  const file_url = await uploadToDrive(accessToken, org.google_drive_folder_id, file)

  const [doc] = await db
    .insert(documents)
    .values({ org_id, tenant_id, doc_type, file_url })
    .returning()

  return Response.json(doc, { status: 201 })
}
