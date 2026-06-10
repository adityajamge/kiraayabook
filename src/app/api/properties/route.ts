import { db } from '@/lib/db'
import { properties, rooms, tenants } from '@/lib/db/schema'
import { getOrgId, withAuth} from '@/lib/middleware'
import { eq, sql } from 'drizzle-orm'

export const GET = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)

  const rows = await db.execute(sql`
    SELECT
      p.id, p.name, p.address, p.phones, p.created_at,
      COUNT(DISTINCT r.id)::int  AS room_count,
      COUNT(DISTINCT t.id)::int  AS tenant_count
    FROM properties p
    LEFT JOIN rooms r    ON r.property_id = p.id
    LEFT JOIN tenants t  ON t.property_id = p.id AND t.status = 'active'
    WHERE p.org_id = ${org_id}
    GROUP BY p.id
    ORDER BY p.created_at
  `)

  const result = Array.isArray(rows) ? rows : rows?.rows ?? []
  return Response.json(result)
})

export const POST = withAuth(async (request: Request) => {
  const org_id = await getOrgId(request)
  const { name, address, phones } = await request.json()

  if (!name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const [property] = await db
    .insert(properties)
    .values({ org_id, name: name.trim(), address: address || null, phones: Array.isArray(phones) ? phones : null })
    .returning()

  return Response.json(property, { status: 201 })
})
