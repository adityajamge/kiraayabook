import { db } from '@/lib/db'
import { rooms, tenants } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)

  const propertyFilter = property_id ? sql` AND r.property_id = ${property_id}` : sql``

  const result = await db.execute(sql`
    SELECT
      r.id, r.room_number, r.floor, r.type, r.capacity,
      COUNT(t.id)::int              AS occupied,
      (r.capacity - COUNT(t.id))::int AS vacant
    FROM rooms r
    LEFT JOIN tenants t
      ON t.room_id = r.id AND t.status = 'active'
    WHERE r.org_id = ${org_id} ${propertyFilter}
    GROUP BY r.id
    ORDER BY r.room_number
  `)

  const rows = Array.isArray(result) ? result : result?.rows ?? []
  return Response.json(rows)
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const body = await request.json()

  const { room_number, capacity, floor, type } = body

  if (!room_number || !capacity) {
    return Response.json({ error: 'room_number and capacity are required' }, { status: 400 })
  }

  const [room] = await db
    .insert(rooms)
    .values({ org_id, property_id: property_id || null, room_number, capacity, floor, type })
    .returning()

  return Response.json(room, { status: 201 })
}
