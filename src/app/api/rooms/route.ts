import { db } from '@/lib/db'
import { rooms, tenants } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  const propertyFilter = property_id ? sql` AND r.property_id = ${property_id}` : sql``

  const [countResult, result] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(DISTINCT r.id)::int AS total
      FROM rooms r
      WHERE r.org_id = ${org_id} ${propertyFilter}
    `),
    db.execute(sql`
      SELECT
        r.id, r.room_number, r.floor, r.type, r.capacity,
        COUNT(t.id)::int                AS occupied,
        (r.capacity - COUNT(t.id))::int AS vacant
      FROM rooms r
      LEFT JOIN tenants t
        ON t.room_id = r.id AND t.status = 'active'
      WHERE r.org_id = ${org_id} ${propertyFilter}
      GROUP BY r.id
      ORDER BY r.room_number
      LIMIT ${limit} OFFSET ${offset}
    `),
  ])

  const rows      = Array.isArray(result)      ? result      : result?.rows      ?? []
  const countRows = Array.isArray(countResult) ? countResult : countResult?.rows ?? []
  const total     = Number((countRows[0] as Record<string, unknown>)?.total ?? 0)

  return Response.json({ data: rows, total, limit, offset })
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const body = await request.json()

  if (!property_id) {
    return Response.json({ error: 'property_id is required' }, { status: 400 })
  }

  // Bulk insert: body.rooms is an array
  if (Array.isArray(body.rooms)) {
    if (body.rooms.length === 0 || body.rooms.length > 200) {
      return Response.json({ error: 'rooms array must have 1–200 entries' }, { status: 400 })
    }
    const values = body.rooms.map(
      (r: { room_number: string; capacity: number; floor?: string | null; type?: string | null }) => ({
        org_id,
        property_id,
        room_number: r.room_number,
        capacity: r.capacity,
        floor: r.floor ?? null,
        type: r.type ?? null,
      })
    )
    await db.insert(rooms).values(values)
    return Response.json({ count: values.length }, { status: 201 })
  }

  const { room_number, capacity, floor, type } = body

  if (!room_number || !capacity) {
    return Response.json({ error: 'room_number and capacity are required' }, { status: 400 })
  }

  const [room] = await db
    .insert(rooms)
    .values({ org_id, property_id, room_number, capacity, floor, type })
    .returning()

  return Response.json(room, { status: 201 })
}
