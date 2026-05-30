# KiraayaBook V1 — Complete Build Brief for Coding Agent

## What is this?
A multi-tenant SaaS for PG (paying guest) owners in India to manage tenants,
rooms, rent, and documents. Built with Next.js. Each PG owner is an
"organisation". One login = one PG dashboard. No public registration —
new PGs are onboarded via a CLI script run by the developer.

---

## Tech Stack

| Layer        | Choice                          | Why                              |
|-------------|----------------------------------|----------------------------------|
| Framework    | Next.js 14 (App Router)         | Frontend + API routes in one     |
| Database     | Neon DB (PostgreSQL)            | Free tier, serverless            |
| ORM          | Drizzle ORM                     | Type-safe, works great with Neon |
| Auth         | Custom JWT (jose library)       | No third-party auth dependency   |
| File uploads | Cloudinary                      | 25 GB free, simple SDK           |
| Email        | Resend                          | 3,000 emails/mo free             |
| Hosting      | Vercel                          | Free, native Next.js             |
| Styling      | Tailwind CSS + shadcn/ui        | Fast, clean UI                   |

---

## Project Structure

```
kiraayabook/
├── src/
│   ├── app/
│   │   ├── page.tsx                  ← Home/landing page (login button only)
│   │   ├── login/
│   │   │   └── page.tsx              ← Login form
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            ← Auth guard, loads org from JWT
│   │   │   ├── page.tsx              ← Dashboard home (occupancy + rent summary)
│   │   │   ├── tenants/
│   │   │   │   ├── page.tsx          ← Tenant list
│   │   │   │   └── [id]/page.tsx     ← Tenant detail + documents
│   │   │   ├── rooms/
│   │   │   │   └── page.tsx          ← Room list with occupancy
│   │   │   └── rent/
│   │   │       └── page.tsx          ← Rent records + dues
│   │   └── api/
│   │       ├── auth/
│   │       │   └── login/route.ts    ← POST /api/auth/login
│   │       ├── tenants/
│   │       │   ├── route.ts          ← GET (list) / POST (create)
│   │       │   └── [id]/route.ts     ← GET / PATCH / DELETE
│   │       ├── rooms/
│   │       │   ├── route.ts          ← GET / POST
│   │       │   └── [id]/route.ts     ← GET / PATCH / DELETE
│   │       ├── rent/
│   │       │   ├── route.ts          ← GET / POST
│   │       │   └── [id]/route.ts     ← PATCH (mark paid)
│   │       └── documents/
│   │           └── route.ts          ← POST (upload), GET
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              ← Neon DB client
│   │   │   └── schema.ts             ← Drizzle schema (all tables)
│   │   ├── auth.ts                   ← JWT sign / verify helpers
│   │   └── middleware.ts             ← Route protection helper
├── scripts/
│   └── register-pg.ts                ← CLI script to onboard new PG (root level, NOT in src/)
├── middleware.ts                      ← Next.js middleware (protect /dashboard, root level)
├── .env.local
└── drizzle.config.ts
```

---

## Database Schema (Drizzle ORM)

File: `src/lib/db/schema.ts`

```typescript
import { pgTable, uuid, text, integer, date, timestamp } from 'drizzle-orm/pg-core'

// ── Organisations (one per PG) ─────────────────────────────────────────────
export const organisations = pgTable('organisations', {
  id:         uuid('id').defaultRandom().primaryKey(),
  name:       text('name').notNull(),              // "Sai Kripa PG"
  plan:       text('plan').notNull().default('starter'),
  created_at: timestamp('created_at').defaultNow(),
})

// ── Users (staff/owner of a PG) ───────────────────────────────────────────
export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  org_id:        uuid('org_id').notNull().references(() => organisations.id),
  email:         text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role:          text('role').notNull().default('owner'), // 'owner' | 'staff'
  created_at:    timestamp('created_at').defaultNow(),
})

// ── Rooms ──────────────────────────────────────────────────────────────────
export const rooms = pgTable('rooms', {
  id:          uuid('id').defaultRandom().primaryKey(),
  org_id:      uuid('org_id').notNull().references(() => organisations.id),
  room_number: text('room_number').notNull(),   // "101", "G-3"
  capacity:    integer('capacity').notNull(),   // max tenants in this room
  floor:       text('floor'),                  // optional: "Ground", "1st"
  type:        text('type'),                   // optional: "AC", "Non-AC"
  created_at:  timestamp('created_at').defaultNow(),
})

// ── Tenants ────────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id:           uuid('id').defaultRandom().primaryKey(),
  org_id:       uuid('org_id').notNull().references(() => organisations.id),
  room_id:      uuid('room_id').notNull().references(() => rooms.id),
  name:         text('name').notNull(),
  phone:        text('phone').notNull(),
  email:        text('email'),                 // optional
  cot_number:   text('cot_number'),            // optional free-text, e.g. "C2"
  move_in_date: date('move_in_date').notNull(),
  move_out_date: date('move_out_date'),        // null = currently active
  status:       text('status').notNull().default('active'), // 'active' | 'vacated'
  created_at:   timestamp('created_at').defaultNow(),
})

// ── Rent Records ───────────────────────────────────────────────────────────
// One row = one month's rent for one tenant
export const rent_records = pgTable('rent_records', {
  id:           uuid('id').defaultRandom().primaryKey(),
  org_id:       uuid('org_id').notNull().references(() => organisations.id),
  tenant_id:    uuid('tenant_id').notNull().references(() => tenants.id),
  amount:       integer('amount').notNull(),       // in rupees
  month:        text('month').notNull(),           // "2025-06" (YYYY-MM)
  due_date:     date('due_date').notNull(),
  paid_date:    date('paid_date'),                 // null = not yet paid
  payment_mode: text('payment_mode'),              // 'cash' | 'upi' | 'bank'
  status:       text('status').notNull().default('pending'), // 'pending' | 'paid'
  created_at:   timestamp('created_at').defaultNow(),
})

// ── Documents ──────────────────────────────────────────────────────────────
export const documents = pgTable('documents', {
  id:          uuid('id').defaultRandom().primaryKey(),
  org_id:      uuid('org_id').notNull().references(() => organisations.id),
  tenant_id:   uuid('tenant_id').notNull().references(() => tenants.id),
  doc_type:    text('doc_type').notNull(),   // 'aadhaar' | 'pan' | 'photo' | 'other'
  file_url:    text('file_url').notNull(),   // Cloudinary URL
  uploaded_at: timestamp('uploaded_at').defaultNow(),
})
```

---

## Auth Flow

### Login — `POST /api/auth/login`

```typescript
// 1. Find user by email
// 2. bcrypt.compare(password, user.password_hash)
// 3. If valid, sign JWT:
//    payload = { user_id, org_id, role, exp: 7 days }
// 4. Set JWT as httpOnly cookie named 'kiraayabook_token'
// 5. Return { ok: true }
```

JWT payload shape:
```json
{
  "user_id": "u_abc123",
  "org_id":  "org_xyz456",
  "role":    "owner"
}
```

### Route protection — `middleware.ts`

```typescript
// All /dashboard/* routes:
// 1. Read cookie 'kiraayabook_token'
// 2. Verify JWT with jose
// 3. If invalid/missing → redirect to /login
// 4. If valid → attach org_id to request headers for API routes to read
```

### Every API route pattern

```typescript
// Standard pattern for ALL protected API routes:
export async function GET(req: Request) {
  const org_id = req.headers.get('x-org-id') // set by middleware
  const data = await db
    .select()
    .from(tenants)
    .where(eq(tenants.org_id, org_id))  // ALWAYS filter by org_id
  return Response.json(data)
}
```

**Rule: every single DB query must have `.where(eq(table.org_id, org_id))`
without exception. This is what keeps PG A from seeing PG B's data.**

---

## CLI Registration Script

File: `scripts/register-pg.ts`

Run with: `npx ts-node scripts/register-pg.ts`

```typescript
import { db } from '../src/lib/db'
import { organisations, users } from '../src/lib/db/schema'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(res => rl.question(q, res))

async function main() {
  console.log('\n── KiraayaBook: Register new PG ──\n')

  const pgName  = await ask('PG name:         ')
  const email   = await ask('Owner email:     ')
  const password = await ask('Password:        ')

  const hash = await bcrypt.hash(password, 12)

  // Single transaction — both rows or neither
  await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({ name: pgName })
      .returning()

    await tx.insert(users).values({
      org_id:        org.id,
      email:         email,
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
```

---

## Home Page (src/app/page.tsx)

- Clean landing page explaining what KiraayaBook is
- Single "Login" button → navigates to `/login`
- No registration button, no signup link anywhere
- If user is already logged in (valid cookie), redirect straight to `/dashboard`

---

## Key Queries to Implement

### Room occupancy (for rooms page and dashboard)
```sql
SELECT
  r.id, r.room_number, r.floor, r.type, r.capacity,
  COUNT(t.id)                        AS occupied,
  r.capacity - COUNT(t.id)           AS vacant
FROM rooms r
LEFT JOIN tenants t
  ON t.room_id = r.id AND t.status = 'active'
WHERE r.org_id = $org_id
GROUP BY r.id
ORDER BY r.room_number
```

### Dashboard summary (rent this month)
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  SUM(amount) FILTER (WHERE status = 'paid') AS collected,
  SUM(amount) FILTER (WHERE status = 'pending') AS pending_amount
FROM rent_records
WHERE org_id = $org_id AND month = '2025-06'
```

---

## WhatsApp Reminder (no API needed)

When owner clicks "Send reminder" on a tenant with pending rent:

```typescript
const message = encodeURIComponent(
  `Hi ${tenant.name}, your rent of ₹${amount} for ${month} is due. Please pay at the earliest. - ${orgName}`
)
const url = `https://wa.me/91${tenant.phone}?text=${message}`
window.open(url, '_blank')
```

Opens WhatsApp on owner's phone/desktop with message pre-filled.
Owner just taps send. Zero cost, works from day one.

---

## Environment Variables (.env.local)

```
DATABASE_URL=         # Neon connection string
JWT_SECRET=           # random 32-char string
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=       # for email reminders (optional in V1)
```

---

## What is NOT in V1 (do not build)

- Public registration / signup page
- Payment gateway (Razorpay etc.)
- Automatic WhatsApp API reminders
- Expense tracking
- Revenue charts / reports
- Multi-property switcher
- Tenant-facing portal
- Mobile app (Capacitor) — web only for now

---

## IMPORTANT INSTRUCTION FOR CODING AGENT

**Do NOT generate any UI, components, or frontend pages at this stage.**

Not a single page. Not a single component. No `src/app/page.tsx`, no
`src/app/login/page.tsx`, no dashboard layout, nothing visual whatsoever.

Focus only on:
- Project setup and configuration
- Drizzle ORM schema (`src/lib/db/schema.ts`)
- Neon DB connection (`src/lib/db/index.ts`)
- Drizzle config (`drizzle.config.ts`)
- JWT helper functions (`src/lib/auth.ts`)
- Middleware for route protection (`middleware.ts` at root, `src/lib/middleware.ts` for helpers)
- All API routes under `src/app/api/`
- CLI registration script (`scripts/register-pg.ts`)
- Environment variable setup

UI will be designed separately and sent as screenshots later.
Build only the backend, database, and auth layer for now.
