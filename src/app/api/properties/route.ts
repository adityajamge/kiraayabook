import { db } from '@/lib/db'
import { properties, rooms, tenants } from '@/lib/db/schema'
import { getOrgId } from '@/lib/middleware'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)

  const rows = await db.execute(sql`
    SELECT
      p.id, p.name, p.address, p.phone, p.created_at,
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
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const { name, address, phone } = await request.json()

  if (!name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const [property] = await db
    .insert(properties)
    .values({ org_id, name: name.trim(), address: address || null, phone: phone || null })
    .returning()

  return Response.json(property, { status: 201 })
}
