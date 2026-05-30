import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, and } from 'drizzle-orm'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function GET(request: Request) {
  const org_id = getOrgId(request)
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')

  const condition = tenant_id
    ? and(eq(documents.org_id, org_id), eq(documents.tenant_id, tenant_id))
    : eq(documents.org_id, org_id)

  const rows = await db.select().from(documents).where(condition)
  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = getOrgId(request)
  const formData = await request.formData()

  const file = formData.get('file') as File | null
  const tenant_id = formData.get('tenant_id') as string | null
  const doc_type = formData.get('doc_type') as string | null

  if (!file || !tenant_id || !doc_type) {
    return Response.json({ error: 'file, tenant_id, and doc_type are required' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const file_url = await new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: `kiraayabook/${org_id}`, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) return reject(error)
          resolve(result.secure_url)
        }
      )
      .end(buffer)
  })

  const [doc] = await db
    .insert(documents)
    .values({ org_id, tenant_id, doc_type, file_url })
    .returning()

  return Response.json(doc, { status: 201 })
}
