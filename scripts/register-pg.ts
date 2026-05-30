import { db } from '../src/lib/db'
import { organisations, users } from '../src/lib/db/schema'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(res => rl.question(q, res))

async function main() {
  console.log('\n── KiraayaBook: Register new PG ──\n')

  const pgName   = await ask('PG name:     ')
  const email    = await ask('Owner email: ')
  const password = await ask('Password:    ')

  const hash = await bcrypt.hash(password, 12)

  await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({ name: pgName })
      .returning()

    await tx.insert(users).values({
      org_id:        org.id,
      email,
      password_hash: hash,
      role:          'owner',
    })

    console.log(`\nDone! Created org: ${org.id}`)
    console.log(`PG "${pgName}" registered. Owner can now log in with ${email}\n`)
  })

  rl.close()
  process.exit(0)
}

main().catch(console.error)
