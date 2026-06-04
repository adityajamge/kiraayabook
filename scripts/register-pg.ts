import { db } from '../src/lib/db'
import { organisations, users } from '../src/lib/db/schema'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(res => rl.question(q, res))

async function main() {
  console.log('\n── KiraayaBook: Register new PG ──\n')

  const pgName    = await ask('PG full name   (e.g. Nathkrupa PG Service):          ')
  const shortName = await ask('PWA short name (shown on home screen, max ~12 chars): ')
  const domain    = await ask('Domain         (e.g. nathkrupa.kiraayabook.com):      ')

  if (!domain.includes('.')) {
    console.error('\nInvalid domain.')
    process.exit(1)
  }

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

  await db.insert(users).values({
    org_id:        org.id,
    email,
    password_hash: hash,
    role:          'owner',
  })

  console.log(`\n✓ Done!`)
  console.log(`  Org ID:    ${org.id}`)
  console.log(`  Domain:    ${domain}`)
  console.log(`  PWA name:  ${pgName}`)
  console.log(`  Login:     ${email}\n`)

  rl.close()
  process.exit(0)
}

main().catch(console.error)
