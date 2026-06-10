import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { getOrgId, withAuth} from '@/lib/middleware'
import { eq } from 'drizzle-orm'

export const GET = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  const [org] = await db
    .select({
      name:       organisations.name,
      owner_name: organisations.owner_name,
      phone:      organisations.phone,
      address:    organisations.address,
      logo_url:   organisations.logo_url,
      bill_notes: organisations.bill_notes,
      dark_mode:  organisations.dark_mode,
      language:   organisations.language,
    })
    .from(organisations)
    .where(eq(organisations.id, org_id))
  return Response.json(org)
})

export const PUT = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if ('name'       in body) updates.name       = body.name
  if ('owner_name' in body) updates.owner_name = body.owner_name
  if ('phone'      in body) updates.phone      = body.phone
  if ('address'    in body) updates.address    = body.address
  if ('bill_notes' in body) updates.bill_notes = body.bill_notes
  if ('dark_mode'  in body) updates.dark_mode  = body.dark_mode
  if ('language'   in body) updates.language   = body.language

  if (Object.keys(updates).length === 0)
    return Response.json({ error: 'nothing to update' }, { status: 400 })

  const [updated] = await db
    .update(organisations)
    .set(updates)
    .where(eq(organisations.id, org_id))
    .returning()
  return Response.json(updated)
})
