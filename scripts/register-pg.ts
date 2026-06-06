import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/lib/db/schema'
import { organisations, users, properties } from '../src/lib/db/schema'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(res => rl.question(q, res))

async function main() {
  console.log('\n── KiraayaBook: Register new PG ──\n')

  // ── Database connection ──
  const envUrl = process.env.DATABASE_URL
  let dbUrl: string

  if (envUrl) {
    const useEnv = await ask(`Use DATABASE_URL from .env.local? (y/n): `)
    if (useEnv.trim().toLowerCase() === 'y') {
      dbUrl = envUrl
    } else {
      dbUrl = await ask('Enter Neon PostgreSQL connection string: ')
    }
  } else {
    console.log('No DATABASE_URL found in .env.local.')
    dbUrl = await ask('Enter Neon PostgreSQL connection string: ')
  }

  if (!dbUrl.trim()) {
    console.error('No connection string provided. Aborting.')
    process.exit(1)
  }

  const db = drizzle({ client: neon(dbUrl.trim()), schema })
  console.log('')

  const pgName    = await ask('PG full name   (e.g. Nathkrupa PG Service):          ')
  const shortName = await ask('PWA short name (shown on home screen, max ~12 chars): ')
  const domain    = await ask('Domain         (e.g. nathkrupa.kiraayabook.com):      ')

  if (!domain.includes('.')) {
    console.error('\nInvalid domain.')
    process.exit(1)
  }

  console.log('\n── First Property ──\n')
  const propName    = await ask('Property name    (e.g. Nathkrupa PG - Kothrud): ')
  const propAddress = await ask('Property address (optional, press Enter to skip): ')

  if (!propName.trim()) {
    console.error('\nProperty name is required.')
    process.exit(1)
  }

  console.log('\n── Owner Account ──\n')
  const email     = await ask('Owner email:   ')
  const password  = await ask('Password:      ')

  const hash = await bcrypt.hash(password, 12)

  const [org] = await db
    .insert(organisations)
    .values({
      name:       pgName,
      domain:     domain.trim().toLowerCase(),
      short_name: shortName.trim() || pgName.split(' ')[0],
    })
    .returning()

  const [property] = await db
    .insert(properties)
    .values({
      org_id:  org.id,
      name:    propName.trim(),
      address: propAddress.trim() || null,
    })
    .returning()

  await db.insert(users).values({
    org_id:        org.id,
    email,
    password_hash: hash,
    role:          'owner',
  })

  console.log(`\n✓ Done!`)
  console.log(`  Org ID:      ${org.id}`)
  console.log(`  Property ID: ${property.id}`)
  console.log(`  Domain:      ${domain}`)
  console.log(`  PWA name:    ${pgName}`)
  console.log(`  Login:       ${email}\n`)

  rl.close()
  process.exit(0)
}

main().catch(console.error)
