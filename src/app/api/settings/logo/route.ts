import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { getOrgId, withAuth} from '@/lib/middleware'
import { eq } from 'drizzle-orm'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const POST = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'file is required' }, { status: 400 })

  const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_LOGO_BYTES = 5 * 1024 * 1024
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return Response.json({ error: 'Logo must be a JPEG, PNG, or WebP image' }, { status: 400 })
  }
  if (file.size > MAX_LOGO_BYTES) {
    return Response.json({ error: 'Logo must be smaller than 5 MB' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const logo_url = await new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder:      `kiraayabook/${org_id}/logo`,
          public_id:   'logo',
          overwrite:   true,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) return reject(error)
          resolve(result.secure_url)
        }
      )
      .end(buffer)
  })

  await db.update(organisations).set({ logo_url }).where(eq(organisations.id, org_id))
  return Response.json({ logo_url })
})

export const DELETE = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  await db.update(organisations).set({ logo_url: null }).where(eq(organisations.id, org_id))
  return Response.json({ ok: true })
})
