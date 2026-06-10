import { getOrgId, getPropertyId } from '@/lib/middleware'
import { ensureRentRecordsUpToDate } from '@/lib/rent'

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)

  if (!property_id) {
    return Response.json({ error: 'property_id is required' }, { status: 400 })
  }

  await ensureRentRecordsUpToDate(org_id, property_id)
  return Response.json({ ok: true })
}
