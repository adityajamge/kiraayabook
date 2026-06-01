import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Dropping all tables...')

  await sql`DROP TABLE IF EXISTS platform_config CASCADE`
  await sql`DROP TABLE IF EXISTS documents    CASCADE`
  await sql`DROP TABLE IF EXISTS rent_records CASCADE`
  await sql`DROP TABLE IF EXISTS tenants      CASCADE`
  await sql`DROP TABLE IF EXISTS rooms        CASCADE`
  await sql`DROP TABLE IF EXISTS users        CASCADE`
  await sql`DROP TABLE IF EXISTS organisations CASCADE`

  console.log('Creating tables...')

  await sql`
    CREATE TABLE organisations (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                   TEXT NOT NULL,
      owner_name             TEXT,
      phone                  TEXT,
      address                TEXT,
      logo_url               TEXT,
      dark_mode              BOOLEAN NOT NULL DEFAULT false,
      plan                   TEXT NOT NULL DEFAULT 'starter',
      google_access_token    TEXT,
      google_refresh_token   TEXT,
      google_token_expiry    TIMESTAMP,
      google_drive_folder_id TEXT,
      created_at             TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID NOT NULL REFERENCES organisations(id),
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'owner',
      created_at    TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE rooms (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES organisations(id),
      room_number TEXT NOT NULL,
      capacity    INTEGER NOT NULL,
      floor       TEXT,
      type        TEXT,
      created_at  TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE tenants (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID NOT NULL REFERENCES organisations(id),
      room_id       UUID NOT NULL REFERENCES rooms(id),
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL,
      email         TEXT,
      cot_number    TEXT,
      move_in_date  DATE NOT NULL,
      move_out_date DATE,
      status        TEXT NOT NULL DEFAULT 'active',
      rent_amount   INTEGER,
      created_at    TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE rent_records (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id       UUID NOT NULL REFERENCES organisations(id),
      tenant_id    UUID NOT NULL REFERENCES tenants(id),
      amount       INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end   DATE NOT NULL,
      due_date     DATE NOT NULL,
      paid_date    DATE,
      payment_mode TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE documents (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES organisations(id),
      tenant_id   UUID NOT NULL REFERENCES tenants(id),
      doc_type    TEXT NOT NULL,
      file_url    TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT now()
    )
  `

  await sql`DROP TABLE IF EXISTS platform_config CASCADE`

  await sql`
    CREATE TABLE platform_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `

  console.log('Done. Database is clean and ready.')
}

main().catch((err) => { console.error(err); process.exit(1) })
