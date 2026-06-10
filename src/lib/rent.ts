import { db } from '@/lib/db'
import { tenants, rent_records } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type TenantRow = {
  id: string
  move_in_date: string
  rent_amount: number | null
  property_id: string
}

/**
 * Backfills all missing rent_record cycles from the last generated cycle (or
 * move_in_date) up to today.  Safe to call repeatedly — uses ON CONFLICT DO
 * NOTHING on the (tenant_id, cycle_start) unique key.
 *
 * When move_in_date is edited the caller must first delete PENDING records for
 * that tenant, then call this function so cycles are regenerated from scratch.
 */
export async function ensureRentRecordsUpToDate(
  org_id: string,
  property_id: string,
  tenant?: TenantRow,
): Promise<void> {
  let rows: TenantRow[]

  if (tenant) {
    rows = [tenant]
  } else {
    rows = await db
      .select({
        id:           tenants.id,
        move_in_date: tenants.move_in_date,
        rent_amount:  tenants.rent_amount,
        property_id:  tenants.property_id,
      })
      .from(tenants)
      .where(and(
        eq(tenants.org_id, org_id),
        eq(tenants.property_id, property_id),
        eq(tenants.status, 'active'),
      ))
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const row of rows) {
    if (!row.rent_amount) continue

    const moveIn  = new Date(row.move_in_date)
    const day     = moveIn.getDate()

    // Find the latest existing cycle_start for this tenant
    const latestResult = await db.execute(sql`
      SELECT MAX(cycle_start)::text AS max_cs
      FROM rent_records
      WHERE tenant_id = ${row.id} AND org_id = ${org_id}
    `)
    const latestRows = Array.isArray(latestResult) ? latestResult : latestResult?.rows ?? []
    const maxCs: string | null = (latestRows[0] as Record<string, string | null>)?.max_cs ?? null

    // Determine the first cycle to generate
    let cycleStart: Date
    if (!maxCs) {
      cycleStart = new Date(moveIn.getFullYear(), moveIn.getMonth(), day)
    } else {
      const latest = new Date(maxCs)
      // one month after the latest cycle_start
      cycleStart = new Date(latest.getFullYear(), latest.getMonth() + 1, day)
    }

    // Collect all missing cycles up to and including today's cycle
    const toInsert: {
      org_id: string
      property_id: string
      tenant_id: string
      amount_due: number
      cycle_start: string
      cycle_end: string
      status: 'pending'
    }[] = []

    while (cycleStart <= today) {
      const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, day - 1)
      toInsert.push({
        org_id,
        property_id: row.property_id,
        tenant_id:   row.id,
        amount_due:  row.rent_amount,
        cycle_start: localDateStr(cycleStart),
        cycle_end:   localDateStr(cycleEnd),
        status:      'pending',
      })
      cycleStart = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, day)
    }

    if (toInsert.length > 0) {
      await db.insert(rent_records).values(toInsert).onConflictDoNothing()
    }
  }
}

/**
 * Deletes all PENDING rent_records for a tenant (used when move_in_date is
 * edited).  Paid records are never touched.
 */
export async function deletePendingRecords(
  tenant_id: string,
  org_id: string,
): Promise<void> {
  await db.execute(sql`
    DELETE FROM rent_records
    WHERE tenant_id = ${tenant_id}
      AND org_id    = ${org_id}
      AND status    = 'pending'
  `)
}

/**
 * Recomputes and persists rent_record.status based on the sum of its payments.
 * Returns the new status.
 */
export async function recomputeStatus(
  rent_record_id: string,
  org_id: string,
): Promise<'pending' | 'partial' | 'paid'> {
  const result = await db.execute(sql`
    SELECT
      rr.amount_due,
      COALESCE(SUM(p.amount), 0)::int AS amount_paid
    FROM rent_records rr
    LEFT JOIN payments p ON p.rent_record_id = rr.id
    WHERE rr.id = ${rent_record_id} AND rr.org_id = ${org_id}
    GROUP BY rr.id, rr.amount_due
  `)
  const rows = Array.isArray(result) ? result : result?.rows ?? []
  const row  = rows[0] as { amount_due: number; amount_paid: number } | undefined

  if (!row) return 'pending'

  let status: 'pending' | 'partial' | 'paid'
  if (row.amount_paid >= row.amount_due) {
    status = 'paid'
  } else if (row.amount_paid > 0) {
    status = 'partial'
  } else {
    status = 'pending'
  }

  await db.execute(sql`
    UPDATE rent_records SET status = ${status}
    WHERE id = ${rent_record_id} AND org_id = ${org_id}
  `)

  return status
}
