import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Running migrations...')

  // platform_config table
  await sql`
    CREATE TABLE IF NOT EXISTS platform_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `
  console.log('✓ platform_config')

  // Google Drive columns on organisations
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS google_access_token    TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS google_refresh_token   TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS google_token_expiry    TIMESTAMP`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT`
  console.log('✓ organisations (google drive columns)')

  // period_start / period_end on rent_records (in case db:push was never run)
  await sql`ALTER TABLE rent_records ADD COLUMN IF NOT EXISTS period_start DATE`
  await sql`ALTER TABLE rent_records ADD COLUMN IF NOT EXISTS period_end   DATE`
  // drop old month column if it still exists
  await sql`ALTER TABLE rent_records DROP COLUMN IF EXISTS month`
  console.log('✓ rent_records (period_start, period_end)')

  // Language preference on organisations
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'`
  console.log('✓ organisations (language column)')

  // ── Rent Architecture Redesign ──────────────────────────────────────────────
  // 1. Create payments table
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id         UUID NOT NULL REFERENCES organisations(id),
      property_id    UUID NOT NULL REFERENCES properties(id),
      tenant_id      UUID NOT NULL REFERENCES tenants(id),
      rent_record_id UUID NOT NULL REFERENCES rent_records(id),
      amount         INTEGER NOT NULL,
      paid_date      DATE NOT NULL,
      payment_mode   TEXT,
      note           TEXT,
      created_at     TIMESTAMP DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS payments_org_id_rent_record_id_idx ON payments (org_id, rent_record_id)`
  await sql`CREATE INDEX IF NOT EXISTS payments_org_id_tenant_id_idx ON payments (org_id, tenant_id)`
  console.log('✓ payments table')

  // 2. Migrate existing paid records into payments (safe to re-run: INSERT ... WHERE NOT EXISTS)
  await sql`
    INSERT INTO payments (org_id, property_id, tenant_id, rent_record_id, amount, paid_date, payment_mode)
    SELECT rr.org_id, rr.property_id, rr.tenant_id, rr.id,
           rr.amount, COALESCE(rr.paid_date, CURRENT_DATE), rr.payment_mode
    FROM rent_records rr
    WHERE rr.status = 'paid'
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.rent_record_id = rr.id
      )
  `
  console.log('✓ existing paid records migrated to payments')

  // 3. Rename columns on rent_records (idempotent: rename only if old name still exists)
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_records' AND column_name='amount') THEN
        ALTER TABLE rent_records RENAME COLUMN amount TO amount_due;
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_records' AND column_name='period_start') THEN
        ALTER TABLE rent_records RENAME COLUMN period_start TO cycle_start;
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_records' AND column_name='period_end') THEN
        ALTER TABLE rent_records RENAME COLUMN period_end TO cycle_end;
      END IF;
    END $$
  `
  console.log('✓ rent_records columns renamed (amount_due, cycle_start, cycle_end)')

  // 4. Drop obsolete columns
  await sql`ALTER TABLE rent_records DROP COLUMN IF EXISTS due_date`
  await sql`ALTER TABLE rent_records DROP COLUMN IF EXISTS paid_date`
  await sql`ALTER TABLE rent_records DROP COLUMN IF EXISTS payment_mode`
  console.log('✓ rent_records obsolete columns dropped')

  // 5. Replace unique index
  await sql`DROP INDEX IF EXISTS rent_records_tenant_id_due_date_uidx`
  await sql`DROP INDEX IF EXISTS rent_records_org_id_status_due_date_idx`
  await sql`DROP INDEX IF EXISTS rent_records_org_id_tenant_id_due_date_idx`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS rent_records_tenant_id_cycle_start_uidx ON rent_records (tenant_id, cycle_start)`
  await sql`CREATE INDEX IF NOT EXISTS rent_records_org_id_status_cycle_start_idx ON rent_records (org_id, status, cycle_start)`
  await sql`CREATE INDEX IF NOT EXISTS rent_records_org_id_tenant_id_cycle_start_idx ON rent_records (org_id, tenant_id, cycle_start)`
  console.log('✓ rent_records indexes updated')

  console.log('\nAll migrations applied.\n')
  process.exit(0)
}

main().catch(err => { console.error(err.message); process.exit(1) })
