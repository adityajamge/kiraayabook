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

  console.log('\nAll migrations applied.\n')
  process.exit(0)
}

main().catch(err => { console.error(err.message); process.exit(1) })
