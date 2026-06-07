import { db } from '@/lib/db'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const rowsOf = <T>(result: unknown): T[] => {
    if (Array.isArray(result)) return result as T[]
    const maybeRows = (result as { rows?: T[] } | null)?.rows
    return Array.isArray(maybeRows) ? maybeRows : []
  }

  const pf = property_id ? sql` AND r.property_id = ${property_id}` : sql``
  const pfT = property_id ? sql` AND property_id = ${property_id}` : sql``

  const [
    roomStatsRaw,
    rentRaw,
    pendingRentRaw,
    vacantRoomsRaw,
    expenseRaw,
  ] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(DISTINCT r.id)::int                          AS total_rooms,
        COALESCE(SUM(r.capacity), 0)::int                 AS total_capacity,
        COALESCE(SUM(COALESCE(occ.cnt, 0)), 0)::int       AS total_occupied
      FROM rooms r
      LEFT JOIN (
        SELECT room_id, COUNT(*)::int AS cnt
        FROM tenants
        WHERE org_id = ${org_id} AND status = 'active' ${pfT}
        GROUP BY room_id
      ) occ ON occ.room_id = r.id
      WHERE r.org_id = ${org_id} ${pf}
    `),
    db.execute(sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::int    AS collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount
      FROM rent_records
      WHERE org_id = ${org_id} AND TO_CHAR(due_date, 'YYYY-MM') = ${month} ${pfT}
    `),
    db.execute(sql`
      SELECT rr.id, rr.amount, rr.due_date,
        t.id AS tenant_id, t.name AS tenant_name, t.phone,
        r.room_number
      FROM rent_records rr
      JOIN tenants t ON t.id = rr.tenant_id
      JOIN rooms r   ON r.id  = t.room_id
      WHERE rr.org_id = ${org_id} AND TO_CHAR(rr.due_date, 'YYYY-MM') = ${month} AND rr.status = 'pending' ${pfT}
      ORDER BY rr.amount DESC
    `),
    db.execute(sql`
      SELECT r.id, r.room_number, r.floor,
        (r.capacity - COALESCE(occ.cnt, 0))::int AS vacant
      FROM rooms r
      LEFT JOIN (
        SELECT room_id, COUNT(*)::int AS cnt
        FROM tenants
        WHERE org_id = ${org_id} AND status = 'active' ${pfT}
        GROUP BY room_id
      ) occ ON occ.room_id = r.id
      WHERE r.org_id = ${org_id} ${pf}
        AND (r.capacity - COALESCE(occ.cnt, 0)) > 0
      ORDER BY r.room_number
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int AS total
      FROM expenses
      WHERE org_id = ${org_id} AND TO_CHAR(date, 'YYYY-MM') = ${month} ${pfT}
    `),
  ])

  const roomStatsRows = rowsOf<{ total_rooms: number; total_capacity: number; total_occupied: number }>(roomStatsRaw)
  const rentRows      = rowsOf<{ collected: number; pending_amount: number }>(rentRaw)
  const pendingRent   = rowsOf<{ id: string; amount: number; due_date: string; tenant_id: string; tenant_name: string; phone: string; room_number: string }>(pendingRentRaw)
  const vacantRooms   = rowsOf<{ id: string; room_number: string; floor: string | null; vacant: number }>(vacantRoomsRaw)
  const expenseRows   = rowsOf<{ total: number }>(expenseRaw)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rs = (roomStatsRows as any)[0] ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rr = (rentRows as any)[0] ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ex = (expenseRows as any)[0] ?? {}

  return Response.json({
    stats: {
      total_rooms:      rs.total_rooms    ?? 0,
      total_capacity:   rs.total_capacity ?? 0,
      total_occupied:   rs.total_occupied ?? 0,
      rent_collected:   rr.collected      ?? 0,
      rent_pending:     rr.pending_amount ?? 0,
      expenses_total:   ex.total          ?? 0,
    },
    pending_rent: pendingRent,
    vacant_rooms: vacantRooms,
    month,
  })
}
