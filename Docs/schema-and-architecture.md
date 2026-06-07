# KiraayaBook — Schema & Architecture Reference

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon DB (PostgreSQL, serverless) |
| ORM | Drizzle ORM (`drizzle-orm/neon-http`) |
| Auth | JWT via `jose` (HS256, 7-day expiry) |
| File storage | Google Drive (per-org OAuth2) |
| Migrations | `drizzle-kit push` (`pnpm db:push`) |
| Onboarding | CLI script — `pnpm register-pg` → `scripts/register-pg.ts` |

> **Next.js 16 note:** The middleware file is named `proxy.ts` (root level), not `middleware.ts`. This is a breaking rename in Next.js 16.

---

## Database Schema

### Entity Relationship Overview

```
organisations
  └── properties           (org_id → organisations.id)
       ├── rooms            (org_id, property_id)
       │    └── tenants     (org_id, property_id, room_id)
       │         ├── rent_records   (org_id, property_id, tenant_id)
       │         └── documents      (org_id, property_id, tenant_id)
       └── expenses         (org_id, property_id)

users                       (org_id → organisations.id, property_id → properties.id [optional])

platform_config             (standalone — no org_id, global key-value store)
```

---

### Table: `organisations`

The root entity. Every other table (except `platform_config`) traces back here via `org_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto-generated |
| `name` | text NOT NULL | PG/hostel name shown in UI |
| `domain` | text UNIQUE NOT NULL | slug used for tenant routing (e.g. `mypg`) |
| `short_name` | text | short label for bills/headers |
| `owner_name` | text | printed on bills |
| `phone` | text | contact number |
| `address` | text | full address |
| `logo_url` | text | Cloudinary URL |
| `bill_notes` | text | footer text on rent bills |
| `dark_mode` | boolean default `false` | per-org UI preference |
| `language` | text default `'en'` | i18n locale |
| `plan` | text default `'starter'` | future billing tier |
| `google_client_id/secret` | text | per-org Google OAuth credentials |
| `google_access_token` | text | current Drive token |
| `google_refresh_token` | text | used to refresh access token |
| `google_token_expiry` | timestamp | if past, `documents` route auto-refreshes |
| `google_drive_folder_id` | text | root folder for this org's uploaded docs |
| `created_at` | timestamp | |

---

### Table: `properties`

A PG owner can manage **multiple properties** under one org.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | tenant isolation key |
| `name` | text NOT NULL | e.g. "Shivaji Nagar Block A" |
| `address` | text | |
| `phones` | text[] | array of contact numbers |
| `created_at` | timestamp | |

**Constraint:** `org_id` ensures you can never see another org's properties.

---

### Table: `users`

Stores both **owners** and **staff** (managers, staff). No separate staff table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | |
| `property_id` | uuid → `properties.id` (nullable) | **null for owners** (can see all), **set for staff** (locked to one property) |
| `email` | text UNIQUE NOT NULL | login credential |
| `password_hash` | text NOT NULL | bcrypt, cost 12 |
| `name` | text | display name |
| `role` | text default `'owner'` | `'owner'` \| `'manager'` \| `'staff'` |
| `created_at` | timestamp | |

**Role rules:**
- `owner` — can switch between properties, manage staff, access all settings.
- `manager` / `staff` — locked to one `property_id` baked into their JWT; cannot switch.

---

### Table: `rooms`

Physical rooms inside a property.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | isolation |
| `property_id` | uuid NOT NULL → `properties.id` | which building |
| `room_number` | text NOT NULL | e.g. "101", "A2" |
| `capacity` | integer NOT NULL | max occupants (beds/cots) |
| `floor` | text | e.g. "Ground", "1st" |
| `type` | text | e.g. "Single", "Double", "Dormitory" |
| `created_at` | timestamp | |

**Derived:** `occupied = COUNT(active tenants in room)`, `vacant = capacity - occupied` — computed live in SQL, not stored.

---

### Table: `tenants`

Active and past residents.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | |
| `property_id` | uuid NOT NULL → `properties.id` | inherited from room at insert time |
| `room_id` | uuid NOT NULL → `rooms.id` | current room assignment |
| `name` | text NOT NULL | |
| `phone` | text NOT NULL | **unique per org** — used as dedup key |
| `email` | text | optional |
| `cot_number` | text | bed/cot label within the room |
| `move_in_date` | date NOT NULL | drives rent cycle due dates |
| `move_out_date` | date | null = still active |
| `status` | text default `'active'` | `'active'` \| `'inactive'` |
| `rent_amount` | integer | monthly rent in ₹; used by `/api/rent/generate` |
| `created_at` | timestamp | |

**Constraint:** Phone is unique per org — inserting a duplicate phone returns 409.

---

### Table: `rent_records`

One record per tenant per billing cycle.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | |
| `property_id` | uuid NOT NULL → `properties.id` | copied from tenant at insert |
| `tenant_id` | uuid NOT NULL → `tenants.id` | |
| `amount` | integer NOT NULL | ₹ amount for this cycle |
| `period_start` | date NOT NULL | cycle start (= `due_date`) |
| `period_end` | date NOT NULL | one day before next month's due date |
| `due_date` | date NOT NULL | same day-of-month as `move_in_date` |
| `paid_date` | date | set when status flips to `'paid'` |
| `payment_mode` | text | `'cash'` \| `'online'` \| `'cheque'` |
| `status` | text default `'pending'` | `'pending'` \| `'paid'` |
| `bill_no` | integer | sequential per org+property; auto-incremented on insert |
| `created_at` | timestamp | |

**Billing cycle logic (`/api/rent/generate`):**
- `due_date` = same day-of-month as `move_in_date`, in the *current* month.
- `period_start` = `due_date`.
- `period_end` = one day before the *next* month's due date.
- If a record already exists for that `tenant_id` + `due_date`, it is skipped (idempotent).

---

### Table: `documents`

Tenant KYC/ID documents uploaded to Google Drive.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | |
| `property_id` | uuid NOT NULL → `properties.id` | |
| `tenant_id` | uuid NOT NULL → `tenants.id` | |
| `doc_type` | text NOT NULL | e.g. "Aadhar", "PAN", "Passport" |
| `file_url` | text NOT NULL | Google Drive view link |
| `uploaded_at` | timestamp | |

**Prerequisite:** The org must have `google_drive_folder_id`, `google_refresh_token`, `google_client_id`, and `google_client_secret` configured — else upload returns 503.

---

### Table: `expenses`

Property-level operational costs.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid NOT NULL → `organisations.id` | |
| `property_id` | uuid NOT NULL → `properties.id` | |
| `description` | text NOT NULL | e.g. "Plumbing repair" |
| `amount` | integer NOT NULL | ₹ |
| `date` | date NOT NULL | when expense occurred |
| `created_at` | timestamp | |

---

### Table: `platform_config`

Global admin key-value store. No `org_id` — not tenant-scoped.

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | config key |
| `value` | text NOT NULL | config value |

---

## Authentication & Session Flow

```
User submits email + password
        │
        ▼
POST /api/auth/login
  - Looks up user by email (no org_id filter — email is globally unique)
  - bcrypt.compare(password, password_hash)
  - Signs JWT: { user_id, org_id, role, property_id? }
  - Sets httpOnly cookie: kiraayabook_token (7 days)
        │
        ▼
proxy.ts runs on every /dashboard/* and /api/* request
  - Reads kiraayabook_token cookie
  - verifyJwt() → JwtPayload
  - Injects request headers:
      x-org-id        ← from JWT
      x-user-id       ← from JWT
      x-user-role     ← from JWT
      x-property-id   ← see below
        │
        ├── role === 'owner'
        │     reads kiraayabook_property cookie
        │     if missing → queries first property for this org
        │     sets x-property-id
        │
        └── role !== 'owner' (manager/staff)
              uses payload.property_id from JWT (immutable)
              sets x-property-id
```

### Cookies

| Cookie | Contents | Duration |
|---|---|---|
| `kiraayabook_token` | Signed JWT (HS256) | 7 days |
| `kiraayabook_property` | UUID of selected property | 30 days |

### Property Switching (owners only)

`POST /api/auth/select-property` — validates the `property_id` belongs to the org, then sets/clears the `kiraayabook_property` cookie. Staff cannot call this (returns 403).

---

## Multi-Tenancy: The `org_id` Rule

**Every query against tenant data MUST include `WHERE org_id = $org_id`.**

The `org_id` comes from the injected header `x-org-id` (set by proxy.ts from the verified JWT). API routes read it via:

```ts
const org_id = await getOrgId(request)       // reads x-org-id header, falls back to JWT
const property_id = getPropertyId(request)   // reads x-property-id header (nullable)
const ctx = await getAuthContext(request)    // { org_id, user_id, role, property_id }
```

`getOrgId` and `getAuthContext` are in [`src/lib/middleware.ts`](../src/lib/middleware.ts).

Failure to filter by `org_id` = cross-tenant data leak.

---

## API Surface

### Auth
| Method | Path | What it does |
|---|---|---|
| POST | `/api/auth/login` | Validate credentials, set JWT cookie |
| POST | `/api/auth/logout` | Clear both cookies |
| POST | `/api/auth/select-property` | Owner switches active property (sets cookie) |

### Core Resources
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/properties` | List (with room+tenant counts) or create property |
| GET/PATCH/DELETE | `/api/properties/[id]` | Read / update / delete one property |
| GET/POST | `/api/rooms` | List (with occupied/vacant counts via SQL join) or create room |
| GET/PATCH/DELETE | `/api/rooms/[id]` | Read / update / delete one room |
| GET/POST | `/api/tenants` | List (filterable by `room_id`) or create tenant |
| GET/PATCH/DELETE | `/api/tenants/[id]` | Read / update / delete one tenant |
| GET/POST | `/api/rent` | List rent records or create one manually |
| PATCH | `/api/rent/[id]` | Mark as paid (`status='paid'`, sets `paid_date`) |
| POST | `/api/rent/generate` | Idempotent bulk-create current-cycle records for all active tenants |
| GET/POST | `/api/documents` | List (by `tenant_id`) or upload to Google Drive |
| GET/POST | `/api/expenses` | List or create expense |
| PATCH/DELETE | `/api/expenses/[id]` | Update or delete expense |
| GET/POST | `/api/staff` | List staff (owner-only) or create staff user |
| PATCH/DELETE | `/api/staff/[id]` | Update or delete staff user |
| GET/PUT | `/api/settings` | Read or update org settings |
| POST | `/api/settings/logo` | Upload logo to Cloudinary, update `logo_url` |
| GET | `/api/me` | Current user's profile |
| GET | `/api/org` | Current org's public info |
| GET | `/api/dashboard` | Aggregated stats: rooms, rent, expenses, pending list |

---

## Key Business Rules & Constraints

| Rule | Where enforced |
|---|---|
| Phone must be exactly 10 digits | `POST /api/tenants` |
| Phone unique per org | DB check + 409 response in `POST /api/tenants` |
| Email globally unique | DB `UNIQUE` on `users.email` |
| Staff locked to one property | `users.property_id` stored in JWT at login, read-only |
| Owner can switch properties; staff cannot | `select-property` route checks `role === 'owner'` |
| Rent records are idempotent on generate | `generate` checks for existing `tenant_id + due_date` |
| Bill numbers are sequential per org | `MAX(bill_no) + 1` on insert — no gaps guarantee |
| Documents need Google Drive configured | 503 returned if org missing Drive credentials |
| Google access token auto-refreshed | Checked against `google_token_expiry` before every upload |
| Every resource query must filter `org_id` | Enforced in every route handler manually |

---

## Request Flow Diagram

```
Browser
  │
  ├─ GET /dashboard/*  ──► proxy.ts ──► injects headers ──► Next.js Page (RSC or client)
  │
  └─ fetch /api/*      ──► proxy.ts ──► injects headers ──► Route Handler
                                                               │
                                                               ├─ getOrgId()       reads x-org-id
                                                               ├─ getPropertyId()  reads x-property-id
                                                               ├─ getAuthContext() reads all three
                                                               │
                                                               └─ Drizzle ORM ──► Neon PostgreSQL
```

---

## What is NOT in V1

- Public tenant signup / portal
- Payment gateway (Razorpay/Stripe)
- WhatsApp notifications
- Expense analytics / charts
- Multi-property switcher in UI (API is ready; UI switcher pending)
- Mobile app
- Cloudinary direct upload from UI (logo upload uses server-side upload)
