import { db } from '@/lib/db'
import { tenants, rent_records } from '@/lib/db/schema'
import { getOrgId, getPropertyId } from '@/lib/middleware'
import { eq, and, sql } from 'drizzle-orm'

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Due date = joining_day of current month. Period starts on due date, ends the day before next month's due date.
// e.g. joined Jan 5, paying on Jun 5 → period = Jun 5 – Jul 4
function currentCycleDates(moveInDate: string): { due_date: string; period_start: string; period_end: string } {
  const day = parseInt(moveInDate.split('-')[2])
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), day)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, day - 1)
  return {
    due_date:     localDateStr(due),
    period_start: localDateStr(due),  // period starts on the due date itself
    period_end:   localDateStr(end),
  }
}

export async function POST(request: Request) {
  const org_id = await getOrgId(request)
  const property_id = getPropertyId(request)

  if (!property_id) {
    return Response.json({ error: 'property_id is required' }, { status: 400 })
  }

  const activeTenants = await db
    .select()
    .from(tenants)
    .where(and(
      eq(tenants.org_id, org_id),
      eq(tenants.property_id, property_id),
      eq(tenants.status, 'active'),
    ))

  const records = activeTenants
    .filter(t => t.rent_amount)
    .map(tenant => {
      const { due_date, period_start, period_end } = currentCycleDates(tenant.move_in_date)
      return {
        org_id,
        property_id:  tenant.property_id,
        tenant_id:    tenant.id,
        amount:       tenant.rent_amount!,
        period_start,
        period_end,
        due_date,
        status:       'pending' as const,
      }
    })

  if (records.length > 0) {
    await db.insert(rent_records).values(records).onConflictDoNothing()
  }

  // Return current-cycle records for the selected property only
  const rows = await db.execute(sql`
    SELECT rr.*, t.name AS tenant_name, t.phone, t.room_id, t.rent_amount,
           r.room_number
    FROM rent_records rr
    JOIN tenants t ON t.id = rr.tenant_id
    JOIN rooms r   ON r.id = t.room_id
    WHERE rr.org_id = ${org_id}
      AND rr.property_id = ${property_id}
      AND TO_CHAR(rr.due_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    ORDER BY rr.status DESC, t.name ASC
  `)

  const records = Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows ?? []
  return Response.json(records)
}
