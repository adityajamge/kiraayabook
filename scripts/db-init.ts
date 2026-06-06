import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Dropping all tables...')

  // Drop in FK-safe order (children before parents)
  await sql`DROP TABLE IF EXISTS expenses       CASCADE`
  await sql`DROP TABLE IF EXISTS documents      CASCADE`
  await sql`DROP TABLE IF EXISTS rent_records   CASCADE`
  await sql`DROP TABLE IF EXISTS tenants        CASCADE`
  await sql`DROP TABLE IF EXISTS rooms          CASCADE`
  await sql`DROP TABLE IF EXISTS users          CASCADE`
  await sql`DROP TABLE IF EXISTS properties     CASCADE`
  await sql`DROP TABLE IF EXISTS organisations  CASCADE`
  await sql`DROP TABLE IF EXISTS platform_config CASCADE`

  console.log('Done. Run pnpm db:push to recreate tables from schema.')
}

main().catch((err) => { console.error(err); process.exit(1) })
