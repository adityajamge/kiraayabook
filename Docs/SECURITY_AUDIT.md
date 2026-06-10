# KiraayaBook Security Audit

**Audit Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated + manual review)  
**Branch:** `main`  
**Scope:** Full codebase — API routes, auth, middleware, database layer, file uploads, frontend

---

## Executive Summary

KiraayaBook has a solid multi-tenant foundation (org_id on every table, parameterized queries via Drizzle ORM, httpOnly cookies), but carries **one critical architectural flaw** that completely nullifies all authentication and authorization. A single unauthenticated HTTP request with a spoofed `x-org-id` header can read or write any tenant's data in any organization. Everything else is secondary to fixing that first.

Beyond that blocker, the dashboard API is broken by a bad column reference, login has no brute-force protection, and several mutation endpoints lack input validation. None of the remaining issues require infrastructure changes — they are code fixes.

**Production Readiness Score: 3 / 10**  
Not ready for production. The header-injection bypass must be fixed before any real tenants are onboarded.

---

## Severity Index

| # | Severity | Issue |
|---|----------|-------|
| 1 | 🔴 CRITICAL | Header injection bypasses all authentication and authorization |
| 2 | 🟠 HIGH | Dashboard API references non-existent column — broken for all users |
| 3 | 🟠 HIGH | No rate limiting on login — unlimited brute force |
| 4 | 🟡 MEDIUM | No CSRF protection on any mutation endpoint |
| 5 | 🟡 MEDIUM | `tenant.status` accepts arbitrary strings — no enum validation |
| 6 | 🟡 MEDIUM | `GET /api/payments` ignores property_id — staff cross-property leak |
| — | ✅ BY DESIGN | `GET /api/org` is unauthenticated — required for white-label PWA branding |
| 7 | 🟡 MEDIUM | No file type or size validation on uploads |
| 8 | 🟡 MEDIUM | Google OAuth tokens stored in plaintext in database |
| 9 | 🟡 MEDIUM | Multiple fields accept unvalidated strings (date, doc_type, etc.) |
| 11 | 🟢 LOW | No password strength requirements for staff accounts |
| 12 | 🟢 LOW | Login queries by global email — email existence enumeration (fixed in FIX-03) |

---

## Critical Vulnerabilities

### VULN-01 — Header Injection Bypasses Authentication and Authorization

**Severity:** CRITICAL  
**OWASP Category:** A01 Broken Access Control, A07 Authentication Failures  
**Files:** [src/lib/middleware.ts](src/lib/middleware.ts), [proxy.ts](proxy.ts)

#### What is happening

`proxy.ts` is a Next.js middleware that verifies the JWT cookie and injects auth context as request headers (`x-org-id`, `x-user-id`, `x-user-role`, `x-property-id`). The API route helpers in `src/lib/middleware.ts` then read those headers to get the org/user identity:

```ts
// src/lib/middleware.ts:24-31
export async function getOrgId(req: Request): Promise<string> {
  const org_id = req.headers.get('x-org-id')
  if (org_id) return org_id          // ← TRUSTED WITHOUT ANY JWT CHECK
  const payload = await getJwtPayload(req)
  if (!payload) throw unauthorized()
  return payload.org_id
}

// src/lib/middleware.ts:43-54
export async function getAuthContext(req: Request): Promise<JwtPayload> {
  const org_id  = req.headers.get('x-org-id')
  const user_id = req.headers.get('x-user-id')
  const role    = req.headers.get('x-user-role')
  if (org_id && user_id && role) {
    return { org_id, user_id, role, ... }  // ← NO JWT VERIFICATION AT ALL
  }
  ...
}
```

`proxy.ts` only **adds** these headers from the JWT — it does not **strip** any pre-existing headers from the incoming request. When no valid JWT is present, proxy.ts calls `NextResponse.next()` and passes the request through unmodified:

```ts
// proxy.ts:9-11
const token = request.cookies.get('kiraayabook_token')?.value
if (!token) return NextResponse.next()   // ← original headers pass through
```

#### The attack

An attacker with no account makes a direct HTTP request to any API endpoint with spoofed headers:

```http
GET /api/tenants HTTP/1.1
Host: kiraayabook.example.com
x-org-id: <any-victim-org-uuid>
x-user-id: <any-uuid>
x-user-role: owner
x-property-id: <any-victim-property-uuid>
```

`getAuthContext` returns the spoofed payload. The response is the full tenant list for that organization.

The same attack works on POST/PATCH/DELETE — the attacker can create, modify, or delete data in any organization.

This bypasses:
- Every authentication check
- Every authorization check
- All `org_id` isolation
- Role checks (attacker sets `x-user-role: owner` to access owner-only routes like `/api/staff`)

#### Exploitable endpoints

Every API route that calls `getOrgId()` or `getAuthContext()`:

- `GET/POST /api/tenants`
- `GET/PATCH/DELETE /api/tenants/[id]`
- `GET/POST /api/rooms`
- `GET/PATCH/DELETE /api/rooms/[id]`
- `GET /api/rent`
- `GET/DELETE /api/rent/[id]`
- `GET/POST /api/payments`
- `GET/POST /api/expenses`
- `DELETE /api/expenses/[id]`
- `GET/POST /api/documents`
- `GET /api/dashboard`
- `GET/PUT /api/settings`
- `POST/DELETE /api/settings/logo`
- `GET/POST /api/staff` (with `x-user-role: owner`)
- `PATCH/DELETE /api/staff/[id]` (with `x-user-role: owner`)
- `GET/POST /api/properties`
- `PATCH/DELETE /api/properties/[id]`

#### Fix

In `proxy.ts`, strip all `x-*` auth headers from any incoming request **before** processing, regardless of JWT validity. The proxy must be the only source of truth:

```ts
// proxy.ts — add at the start of the function, before any other logic
const headers = new Headers(request.headers)
headers.delete('x-org-id')
headers.delete('x-user-id')
headers.delete('x-user-role')
headers.delete('x-property-id')
headers.delete('x-pathname')
```

Then proceed to set them only from the verified JWT. This ensures externally supplied auth headers are always discarded.

---

## High Risk Issues

### VULN-02 — Dashboard API Uses Non-Existent Column

**Severity:** HIGH (functional + potential data confusion)  
**OWASP Category:** A05 Security Misconfiguration  
**File:** [src/app/api/dashboard/route.ts](src/app/api/dashboard/route.ts) — lines 47, 50, 56

Three queries reference `due_date` and `rr.amount`, neither of which exist on the `rent_records` table. The schema defines `cycle_start`, `cycle_end`, and `amount_due`:

```ts
// dashboard/route.ts:47 — WRONG column names
WHERE org_id = ${org_id} AND TO_CHAR(due_date, 'YYYY-MM') = ${month}

// dashboard/route.ts:50 — rr.amount and rr.due_date don't exist
SELECT rr.id, rr.amount, rr.due_date, ...

// dashboard/route.ts:56
WHERE rr.org_id = ... AND TO_CHAR(rr.due_date, 'YYYY-MM') = ${month}
```

Every dashboard page load will throw a SQL error. The errors are caught by the ORM but result in broken stats (all zeros) and empty pending rent lists. The dashboard appears to load but shows no real data.

#### Fix

Replace `due_date` with `cycle_start` and `rr.amount` with `rr.amount_due` throughout `dashboard/route.ts`.

---

### VULN-03 — No Rate Limiting on Login

**Severity:** HIGH  
**OWASP Category:** A07 Authentication Failures  
**File:** [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)

The login endpoint has no rate limiting, account lockout, or brute force protection. An attacker can make unlimited password guesses against any known email address:

```ts
// No rate limiting anywhere in this file
export async function POST(request: Request) {
  const { email, password } = await request.json()
  // ...
  const valid = await bcrypt.compare(password, user.password_hash)
```

bcrypt at 12 rounds is slow (~200ms/hash), which limits parallel attacks, but sequential attacks over time are unrestricted.

#### Fix

Add IP-based rate limiting (e.g., 5 attempts per 15-minute window per IP). Options:
- Upstash Rate Limit (Redis-backed, works at edge)
- `next-rate-limit` package
- Implement at CDN/WAF level (Cloudflare, Vercel)

At minimum, add a sleep penalty on failure and cap at ~10 attempts before a temporary lockout or CAPTCHA.

---

## Medium Risk Issues

### VULN-04 — No CSRF Protection

**Severity:** MEDIUM  
**OWASP Category:** A01 Broken Access Control  
**Files:** All POST/PATCH/DELETE API routes

No CSRF token is required or checked on any mutation endpoint. All cookies use `SameSite=Lax` which blocks cross-origin form submissions and some navigational requests, but does NOT protect against:

- Cross-origin `fetch()` requests from attacker-controlled pages
- Same-origin requests triggered by injected scripts
- Certain redirect-based CSRF patterns

#### Fix

Next.js 13+ does not include built-in CSRF protection for API routes. Add one of:
- `csrf` (double-submit cookie pattern)
- Check `Origin` / `Referer` header on all mutations against the app's own domain
- Use a custom `X-CSRF-Token` header that JS can set but HTML forms cannot

---

### VULN-05 — Tenant `status` Field Accepts Arbitrary Strings

**Severity:** MEDIUM  
**OWASP Category:** A03 Injection (semantic), A04 Insecure Design  
**File:** [src/app/api/tenants/[id]/route.ts](src/app/api/tenants/[id]/route.ts) — line 56

The PATCH handler allows setting `status` to any string:

```ts
if (body.status !== undefined) normalized.status = body.status
```

Valid values are `'active'` and `'inactive'`. An attacker (authenticated within their own org) could set `status: 'deleted'` or any other string, corrupting the tenant record and causing undefined behavior in queries that filter on `status = 'active'`.

The same issue applies to `move_in_date`, `move_out_date`, and `paid_date` fields across routes — they accept any string and are inserted directly into `date` columns without parsing validation.

#### Fix

Validate `status` against an allowlist: `['active', 'inactive']`. Validate all date strings against ISO format (`YYYY-MM-DD`) before inserting.

---

### VULN-06 — Staff Can Access Cross-Property Payments Within Same Org

**Severity:** MEDIUM  
**OWASP Category:** A01 Broken Access Control (IDOR within org)  
**File:** [src/app/api/payments/route.ts](src/app/api/payments/route.ts) — lines 82-89

`GET /api/payments` filters by `org_id` and optionally by `rent_record_id` or `tenant_id`, but never by `property_id`:

```ts
const conditions = [eq(payments.org_id, org_id)]
if (rent_record_id) conditions.push(eq(payments.rent_record_id, rent_record_id))
if (tenant_id)      conditions.push(eq(payments.tenant_id, tenant_id))
// No property_id filter
```

Staff accounts are locked to a specific property via their JWT. If a staff member from Property A knows a `tenant_id` from Property B (same org), they can query all payments for that tenant by passing it in the query string. The same gap exists on `GET /api/rent` — the `property_id` filter is optional and never enforced for staff.

#### Fix

In `GET /api/payments`, read `property_id` from the request and add it to the condition when present. Since staff always have `property_id` in their JWT, this is automatically restrictive for them while remaining flexible for owners.

---

### VULN-07 — No File Type or Size Limits on Uploads

**Severity:** MEDIUM  
**OWASP Category:** A04 Insecure Design  
**Files:** [src/app/api/settings/logo/route.ts](src/app/api/settings/logo/route.ts), [src/app/api/documents/route.ts](src/app/api/documents/route.ts)

Neither upload endpoint validates file type or file size before uploading to Cloudinary or Google Drive:

```ts
// settings/logo/route.ts — accepts any file type, any size
const bytes = await file.arrayBuffer()
const buffer = Buffer.from(bytes)
cloudinary.uploader.upload_stream({ resource_type: 'image' }, ...)
```

```ts
// documents/route.ts — no validation at all
const file = formData.get('file') as File | null
if (!file ...) return 400
await uploadToDrive(accessToken, folderId, file)
```

Risks:
- Extremely large file uploads exhausting server memory or storage quota
- Non-image files uploaded as logos (Cloudinary will reject `resource_type: 'image'` non-images, but no client-side error handling)
- Malicious content uploaded as tenant documents

#### Fix

Before processing:
- Logo: validate `file.type` is `image/jpeg`, `image/png`, or `image/webp`; cap at 5 MB
- Documents: validate `file.type` against an allowlist (PDF, JPEG, PNG); cap at 20 MB

---

### VULN-08 — Google OAuth Credentials Stored in Plaintext

**Severity:** MEDIUM  
**OWASP Category:** A02 Cryptographic Failures  
**File:** [src/lib/db/schema.ts](src/lib/db/schema.ts) — lines 16–22

The `organisations` table stores Google OAuth credentials in plaintext columns:

```ts
google_client_id:       text('google_client_id'),
google_client_secret:   text('google_client_secret'),
google_access_token:    text('google_access_token'),
google_refresh_token:   text('google_refresh_token'),
```

A database dump or an SQL injection in a future vulnerability would expose long-lived refresh tokens and client secrets for every connected organization, giving full access to their Google Drives.

#### Fix

Encrypt `google_client_secret` and `google_refresh_token` at rest using AES-256-GCM with a server-side key from environment variables before storing. The access token is short-lived and less critical.

---

### VULN-09 — Missing Input Validation Across Multiple Endpoints

**Severity:** MEDIUM  
**OWASP Category:** A03 Injection, A04 Insecure Design  
**Files:** Multiple

No centralized schema validation (Zod, Yup, etc.) exists. Individual routes do manual checks but miss several cases:

| Endpoint | Field | Issue |
|----------|-------|-------|
| `POST /api/payments` | `paid_date` | Any string accepted, no ISO date check |
| `POST /api/tenants` | `move_in_date` | Any string accepted |
| `POST /api/expenses` | `date` | Any string accepted |
| `PATCH /api/tenants/[id]` | `status` | Any string accepted (see VULN-05) |
| `POST /api/documents` | `doc_type` | Any string accepted, no allowlist |
| `POST /api/staff` | `password` | No minimum length or complexity |
| `POST /api/rent/ensure` | (body) | No body validation |
| `POST /api/rooms` (bulk) | `rooms` array | Max 200 checked, but no field-level validation per room |

Invalid date strings inserted into `date` columns will cause PostgreSQL errors that bubble up as unhandled exceptions.

#### Fix

Introduce Zod schemas for all POST/PATCH/PUT request bodies. Validate and parse at the start of each handler before touching the database.

---

## Low Risk Issues

### NOTE-01 — `GET /api/org` is Unauthenticated by Design

**Severity:** ✅ BY DESIGN — not a vulnerability  
**File:** [src/app/api/org/route.ts](src/app/api/org/route.ts)

KiraayaBook is a white-label SaaS. Each PG owner is provisioned a subdomain (e.g., `nathkrupa.kiraayabook.com`). The PWA login page fetches the org's name and logo from this endpoint **before** the user authenticates, so the branded shell (app name, logo) is visible on the login screen.

This is correct behavior. The org name and logo are public-facing identity, not sensitive data. Anyone who visits `nathkrupa.kiraayabook.com` already knows that org exists — the endpoint reveals nothing additional.

**Do not add authentication to this endpoint.** The white-label branding feature depends on it.

**What to keep in mind when fixing VULN-01:** The security hardening of `proxy.ts` (stripping forged `x-org-id` headers) must not interfere with this endpoint. Since `/api/org` reads from the `host` header (not `x-org-id`), it is unaffected by the VULN-01 fix.

---

### VULN-11 — No Password Strength Requirements for Staff

**Severity:** LOW  
**File:** [src/app/api/staff/route.ts](src/app/api/staff/route.ts) — line 41

```ts
if (!name?.trim() || !email?.trim() || !password) { ... }
```

Only checks that `password` is truthy — a single character passes. Weak passwords are vulnerable to brute force (see VULN-03).

#### Fix

Require minimum 8 characters. Consider enforcing a mix of character types or using a password strength library.

---

### VULN-12 — Login Queries by Global Email, Enabling Enumeration

**Severity:** LOW  
**File:** [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts) — line 15

```ts
const [user] = await db.select().from(users).where(eq(users.email, email))
```

The query searches all users globally, not scoped to any org. Combined with timing differences between "user not found" (no bcrypt) and "wrong password" (bcrypt takes ~200ms), an attacker can enumerate valid email addresses across all tenants.

The current error message is correctly generic (`'Invalid credentials'`), but the timing side-channel still leaks information.

#### Fix

Run a dummy `bcrypt.compare` even when the user is not found to normalize response time. This is a standard timing-attack mitigation.

---

## What Is Secure (Do Not Break)

The following security controls are correctly implemented and should be preserved:

- **Multi-tenant org_id isolation** — every database query filters by `org_id`; no cross-org data leakage once the header injection (VULN-01) is fixed
- **SQL injection prevention** — all queries use Drizzle ORM or `sql` template literals with parameterized values; zero string concatenation in WHERE clauses
- **Password hashing** — bcryptjs at 12 rounds; passwords never returned in API responses
- **JWT security** — HS256, `jose` library, 7-day expiry, verified on every request via `verifyJwt`
- **Cookie security** — `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production
- **Ownership verification on payments** — `POST /api/payments` verifies rent record belongs to `org_id` before inserting payment, and checks balance before allowing payment
- **Property ownership in select-property** — `POST /api/auth/select-property` verifies property belongs to org before setting cookie
- **Role-based access** — owner-only routes (`/api/staff`, `/api/auth/select-property`) correctly check `role !== 'owner'`
- **Staff property locking** — staff `property_id` is locked in JWT at login and cannot be changed without reissuing the token

---

## Recommended Fix Order

### Before any production traffic

1. **VULN-01** — Strip `x-org-id`, `x-user-id`, `x-user-role`, `x-property-id` from incoming requests in `proxy.ts`. One-line fix per header.
2. **VULN-02** — Fix `due_date` → `cycle_start` and `rr.amount` → `rr.amount_due` in `dashboard/route.ts`. Dashboard is currently broken for all users.

### Before public launch

3. **VULN-03** — Add Upstash rate limiting to `POST /api/auth/login` (5 attempts / 15 min / IP).
4. **VULN-04** — Add CSRF origin check on all POST/PATCH/DELETE routes.
5. **VULN-05** — Add enum validation for `status`, `doc_type`, `payment_mode` fields.
6. **VULN-06** — Enforce `property_id` filter in `GET /api/payments` and `GET /api/rent` for staff users.
7. **VULN-07** — Add file type and size guards before Cloudinary/Drive uploads.
8. **VULN-09** — Introduce Zod schemas for all request bodies; validate date fields.

### Before handling sensitive documents

9. **VULN-08** — Encrypt `google_client_secret` and `google_refresh_token` at rest.

### Polish / hardening

10. **VULN-11** — Add minimum password length for staff accounts.
11. **VULN-12** — Add dummy bcrypt on missing user to normalize login timing.
12. **NOTE-01** — `GET /api/org` is intentional white-label branding. Do not restrict it.

---

## Production Readiness Score

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | 2/10 | Header injection bypasses all auth |
| Authorization | 3/10 | Good org_id isolation, broken by VULN-01 |
| Multi-tenant isolation | 2/10 | Architecture is sound; VULN-01 nullifies it |
| Input validation | 4/10 | Phone/amount validated; dates/enums are not |
| SQL injection | 9/10 | Parameterized queries throughout |
| Secrets management | 7/10 | Env vars used; .env.local in .gitignore; OAuth tokens unencrypted in DB |
| File security | 4/10 | No type/size validation |
| Rate limiting | 0/10 | None |
| CSRF protection | 2/10 | SameSite=Lax partial only |
| Error handling | 8/10 | Generic errors, no raw DB leaks |

**Overall: 3 / 10 — Not production ready.**  
Fixing VULN-01 and VULN-02 alone raises this to approximately 6/10.

---

## Implementation Guide

> This section is written for a future AI or developer session. Every fix below is self-contained: exact file path, exact code to remove, exact code to add. No context from the original audit conversation is needed. Read this and implement.

### Architecture Context (read before implementing)

- **Framework:** Next.js 16.2.6, App Router, React 19
- **Database:** Neon (serverless PostgreSQL via `@neondatabase/serverless`), ORM is Drizzle
- **Auth:** Custom JWT with `jose`, stored as `kiraayabook_token` httpOnly cookie (7d expiry)
- **Multi-tenant:** Every org has a subdomain (`nathkrupa.kiraayabook.com`). Login page fetches branding via `GET /api/org` using the `host` header — this is intentional and must stay unauthenticated.
- **Native apps:** Capacitor wraps the PWA as iOS/Android apps. Native requests come from `capacitor://localhost` — any CSRF solution must not break these.
- **Auth flow:** `proxy.ts` (Next.js middleware) verifies the JWT cookie and injects `x-org-id`, `x-user-id`, `x-user-role`, `x-property-id` as request headers. Route handlers read those headers via helpers in `src/lib/middleware.ts`.
- **No Zod** in current deps — add it: `pnpm add zod`
- **No rate-limiting infra** — use Neon DB-based approach (no extra services needed)

---

### FIX-01 — Strip forged auth headers in proxy.ts

**File:** `proxy.ts`  
**Risk if skipped:** Any unauthenticated HTTP request with `x-org-id` header bypasses all auth — complete tenant data access.

The current code creates `new Headers(request.headers)` inside the `if (payload.role === 'owner')` branch, which means the original request headers pass through unmodified when there is no token or an invalid one. The fix: always create a clean headers object at the very start and strip all `x-*` auth headers before any other logic.

**Replace the entire `proxy.ts` file with:**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'
import { db } from '@/lib/db'
import { properties } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function proxy(request: NextRequest) {
  // Always strip client-supplied auth headers — this proxy is the only authority
  const headers = new Headers(request.headers)
  headers.delete('x-org-id')
  headers.delete('x-user-id')
  headers.delete('x-user-role')
  headers.delete('x-property-id')
  headers.delete('x-pathname')

  const token = request.cookies.get('kiraayabook_token')?.value
  if (!token) return NextResponse.next({ request: { headers } })

  const payload = await verifyJwt(token)
  if (!payload) {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('kiraayabook_token')
      response.cookies.delete('kiraayabook_property')
      return response
    }
    return NextResponse.next({ request: { headers } })
  }

  headers.set('x-org-id', payload.org_id)
  headers.set('x-user-id', payload.user_id)
  headers.set('x-user-role', payload.role)
  headers.set('x-pathname', request.nextUrl.pathname)

  if (payload.role === 'owner') {
    let propertyId = request.cookies.get('kiraayabook_property')?.value ?? null
    if (!propertyId) {
      try {
        const [first] = await db
          .select({ id: properties.id })
          .from(properties)
          .where(eq(properties.org_id, payload.org_id))
          .orderBy(properties.created_at)
          .limit(1)
        propertyId = first?.id ?? null
      } catch {
        // DB unavailable on cold start — cookie-based sync in DashboardHeader will set it
      }
    }
    if (propertyId) headers.set('x-property-id', propertyId)
  } else if (payload.property_id) {
    headers.set('x-property-id', payload.property_id)
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

**What changed:** The `headers` object is now created unconditionally at the top, with all five auth headers deleted before anything else runs. The `NextResponse.next({ request: { headers } })` calls now always return the cleaned headers even when no token is present.

---

### FIX-02 — Fix broken dashboard SQL queries

**File:** `src/app/api/dashboard/route.ts`  
**Risk if skipped:** Dashboard shows zeros for all metrics. `due_date` and `rr.amount` columns do not exist on `rent_records` — the table has `cycle_start`, `cycle_end`, `amount_due`.

Three specific changes in the file:

**Change 1 — Rent totals query (lines ~43-48):**

Old:
```ts
    db.execute(sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::int    AS collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount
      FROM rent_records
      WHERE org_id = ${org_id} AND TO_CHAR(due_date, 'YYYY-MM') = ${month} ${pfT}
    `),
```

New:
```ts
    db.execute(sql`
      SELECT
        COALESCE(SUM(amount_due) FILTER (WHERE status = 'paid'), 0)::int    AS collected,
        COALESCE(SUM(amount_due) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount
      FROM rent_records
      WHERE org_id = ${org_id} AND TO_CHAR(cycle_start, 'YYYY-MM') = ${month} ${pfT}
    `),
```

**Change 2 — Pending rent list query (lines ~49-57):**

Old:
```ts
    db.execute(sql`
      SELECT rr.id, rr.amount, rr.due_date,
        t.id AS tenant_id, t.name AS tenant_name, t.phone,
        r.room_number
      FROM rent_records rr
      JOIN tenants t ON t.id = rr.tenant_id
      JOIN rooms r   ON r.id  = t.room_id
      WHERE rr.org_id = ${org_id} AND TO_CHAR(rr.due_date, 'YYYY-MM') = ${month} AND rr.status = 'pending' ${pfRR}
      ORDER BY rr.amount DESC
    `),
```

New:
```ts
    db.execute(sql`
      SELECT rr.id, rr.amount_due, rr.cycle_start,
        t.id AS tenant_id, t.name AS tenant_name, t.phone,
        r.room_number
      FROM rent_records rr
      JOIN tenants t ON t.id = rr.tenant_id
      JOIN rooms r   ON r.id  = t.room_id
      WHERE rr.org_id = ${org_id} AND TO_CHAR(rr.cycle_start, 'YYYY-MM') = ${month} AND rr.status = 'pending' ${pfRR}
      ORDER BY rr.amount_due DESC
    `),
```

**Change 3 — The `pendingRent` type annotation (line ~82):**

Old:
```ts
  const pendingRent   = rowsOf<{ id: string; amount: number; due_date: string; ... }>(pendingRentRaw)
```

New:
```ts
  const pendingRent   = rowsOf<{ id: string; amount_due: number; cycle_start: string; ... }>(pendingRentRaw)
```

After applying, verify the dashboard loads non-zero data. The existing `rent_collected` / `rent_pending` keys in the response remain the same — only the SQL column names change.

---

### FIX-03 — Rate limiting on login (DB-based, no extra infra)

**Why DB-based:** No Redis/Upstash in the project. Neon is already available. A `login_attempts` table is sufficient for the threat model (brute force from a single IP).

**Step 1 — Add migration.** Create `src/lib/db/migrations/add_login_attempts.sql`:
```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id         SERIAL PRIMARY KEY,
  ip         TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx
  ON login_attempts (ip, attempted_at DESC);
```
Run it manually via `pnpm drizzle-kit push` or execute it directly against the Neon DB.

**Step 2 — Add to schema** `src/lib/db/schema.ts`, append:
```ts
export const login_attempts = pgTable('login_attempts', {
  id:           integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ip:           text('ip').notNull(),
  attempted_at: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('login_attempts_ip_time_idx').on(t.ip, t.attempted_at),
])
```

**Step 3 — Replace `src/app/api/auth/login/route.ts`:**

```ts
import { db } from '@/lib/db'
import { users, properties, login_attempts } from '@/lib/db/schema'
import { signJwt } from '@/lib/auth'
import { eq, and, gte, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

// Pre-computed hash used to normalize timing when user is not found
const TIMING_DUMMY_HASH = '$2a$12$LIXBzFT4CJGt6W4Z9dVOSuT8UgjHFTh7/XWR5S6Lm9R4J4VqZU3zi'

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  // Check rate limit
  const [{ total }] = await db
    .select({ total: count() })
    .from(login_attempts)
    .where(and(eq(login_attempts.ip, ip), gte(login_attempts.attempted_at, windowStart)))

  if (total >= MAX_ATTEMPTS) {
    return Response.json(
      { error: `Too many login attempts. Try again in ${WINDOW_MINUTES} minutes.` },
      { status: 429 }
    )
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user) {
    // Always run bcrypt to prevent timing-based user enumeration
    await bcrypt.compare(password, TIMING_DUMMY_HASH)
    await db.insert(login_attempts).values({ ip })
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    await db.insert(login_attempts).values({ ip })
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Success — clean up old attempts for this IP (housekeeping, best-effort)
  db.delete(login_attempts)
    .where(and(eq(login_attempts.ip, ip)))
    .catch(() => {})

  const token = await signJwt({
    user_id: user.id,
    org_id: user.org_id,
    role: user.role,
    property_id: user.property_id,
  })

  const response = NextResponse.json({ ok: true })
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  }

  response.cookies.set('kiraayabook_token', token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  })

  if (user.role === 'owner') {
    const [firstProp] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.org_id, user.org_id))
      .orderBy(properties.created_at)
      .limit(1)

    if (firstProp) {
      response.cookies.set('kiraayabook_property', firstProp.id, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      })
    }
  }

  return response
}
```

**Notes:**
- `TIMING_DUMMY_HASH` is a real bcrypt hash of an arbitrary string at cost 12. It ensures the response time is the same whether or not the email exists.
- Cleanup on success is fire-and-forget so the login response isn't slowed.
- Add a periodic cleanup job (or a DB cron) to `DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'` to prevent table bloat.

---

### FIX-04 — CSRF protection via Origin header check

**Context:** The app runs on wildcard subdomains (`*.kiraayabook.com`). `SameSite=Lax` considers all `*.kiraayabook.com` subdomains as "same site", so a CSRF attack from `evil.kiraayabook.com` targeting `nathkrupa.kiraayabook.com` would succeed. An explicit `Origin` check closes this gap.

**Capacitor exception:** Native iOS/Android apps built with Capacitor send `Origin: capacitor://localhost` (or no Origin at all in some versions). The check must allow these.

**Implementation:** Add the check inside `proxy.ts` (FIX-01 must be applied first), just after the header stripping block:

```ts
// proxy.ts — add after the header-stripping block, before the token check
const method = request.method.toUpperCase()
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
  const origin = request.headers.get('origin')
  if (origin) {
    const allowedOrigins = [
      `https://${request.headers.get('host')}`,
      'capacitor://localhost',
      'http://localhost',
      'http://localhost:3000',
    ]
    if (!allowedOrigins.includes(origin)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  // If Origin is absent, the request is from a same-origin navigation or native context — allow it
}
```

Place this block **after** the five `headers.delete()` calls and **before** `const token = request.cookies.get(...)`.

---

### FIX-05 — Enum and date validation

**File:** `src/app/api/tenants/[id]/route.ts`

Add these guards at the top of the PATCH handler, right after `const body = await request.json()`:

```ts
const VALID_STATUSES = ['active', 'inactive']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
  return Response.json({ error: 'status must be active or inactive' }, { status: 400 })
}
if (body.move_in_date  !== undefined && !ISO_DATE.test(body.move_in_date)) {
  return Response.json({ error: 'move_in_date must be YYYY-MM-DD' }, { status: 400 })
}
if (body.move_out_date !== undefined && body.move_out_date !== null && !ISO_DATE.test(body.move_out_date)) {
  return Response.json({ error: 'move_out_date must be YYYY-MM-DD' }, { status: 400 })
}
```

**File:** `src/app/api/payments/route.ts`

Add after `const { rent_record_id, amount, paid_date, payment_mode, note } = body`:

```ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
if (!ISO_DATE.test(paid_date)) {
  return Response.json({ error: 'paid_date must be YYYY-MM-DD' }, { status: 400 })
}
```

**File:** `src/app/api/documents/route.ts`

Add after `const doc_type = formData.get('doc_type')`:

```ts
const VALID_DOC_TYPES = ['aadhaar', 'pan', 'passport', 'photo', 'agreement', 'other']
if (!VALID_DOC_TYPES.includes(doc_type)) {
  return Response.json({ error: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}` }, { status: 400 })
}
```
*(Adjust the allowlist to match whatever doc types the frontend sends.)*

**File:** `src/app/api/expenses/route.ts`

Add after `const { description, amount, date } = await request.json()`:

```ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
if (!ISO_DATE.test(date)) {
  return Response.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
}
```

---

### FIX-06 — Enforce property_id filter on GET /api/payments

**File:** `src/app/api/payments/route.ts`

In the `GET` handler, the current code never adds a `property_id` filter. Staff are scoped to a property via their JWT, but this gap lets them query payments from other properties in the same org by guessing a `tenant_id`.

Replace the conditions block in GET:

```ts
// Old
const conditions = [eq(payments.org_id, org_id)]
if (rent_record_id) conditions.push(eq(payments.rent_record_id, rent_record_id))
if (tenant_id)      conditions.push(eq(payments.tenant_id, tenant_id))
```

```ts
// New — add this import at the top of the file: import { getPropertyId } from '@/lib/middleware'
const property_id = getPropertyId(request)
const conditions = [eq(payments.org_id, org_id)]
if (property_id)    conditions.push(eq(payments.property_id, property_id))
if (rent_record_id) conditions.push(eq(payments.rent_record_id, rent_record_id))
if (tenant_id)      conditions.push(eq(payments.tenant_id, tenant_id))
```

`getPropertyId` is already imported in the POST handler at the top of the file — just move the import to cover both handlers if needed.

---

### FIX-07 — File type and size validation on uploads

**File:** `src/app/api/settings/logo/route.ts`

Add after `const file = formData.get('file') as File | null` and the null check:

```ts
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5 MB

if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
  return Response.json({ error: 'Logo must be a JPEG, PNG, or WebP image' }, { status: 400 })
}
if (file.size > MAX_LOGO_BYTES) {
  return Response.json({ error: 'Logo must be smaller than 5 MB' }, { status: 400 })
}
```

**File:** `src/app/api/documents/route.ts`

Add after the `if (!file || !tenant_id || !doc_type)` check:

```ts
const ALLOWED_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_DOC_BYTES = 20 * 1024 * 1024 // 20 MB

if (!ALLOWED_DOC_MIME.includes(file.type)) {
  return Response.json({ error: 'Document must be PDF, JPEG, or PNG' }, { status: 400 })
}
if (file.size > MAX_DOC_BYTES) {
  return Response.json({ error: 'Document must be smaller than 20 MB' }, { status: 400 })
}
```

---

### FIX-08 — Encrypt Google OAuth tokens at rest

**Why:** `google_client_secret` and `google_refresh_token` are long-lived credentials stored in the `organisations` table. A DB dump exposes them in plaintext.

**Step 1 — Generate an encryption key.** Run once and add to `.env.local`:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add to `.env.local`:
```
ENCRYPTION_KEY=<64-char hex string from above>
```

**Step 2 — Create `src/lib/crypto.ts`:**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)')

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv  = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
```

**Step 3 — Migrate existing data.** Write a one-off script `scripts/encrypt-oauth-tokens.ts`:

```ts
import { db } from '../src/lib/db'
import { organisations } from '../src/lib/db/schema'
import { encrypt } from '../src/lib/crypto'

const orgs = await db.select().from(organisations)
for (const org of orgs) {
  const update: Record<string, string> = {}
  if (org.google_client_secret && !org.google_client_secret.startsWith('enc:')) {
    update.google_client_secret = 'enc:' + encrypt(org.google_client_secret)
  }
  if (org.google_refresh_token && !org.google_refresh_token.startsWith('enc:')) {
    update.google_refresh_token = 'enc:' + encrypt(org.google_refresh_token)
  }
  if (Object.keys(update).length) {
    await db.update(organisations).set(update).where(eq(organisations.id, org.id))
    console.log(`Encrypted tokens for org ${org.id}`)
  }
}
```

Run: `pnpm tsx scripts/encrypt-oauth-tokens.ts`

**Step 4 — Update `src/app/api/documents/route.ts`** to decrypt before use:

```ts
import { decrypt } from '@/lib/crypto'

// In POST handler, after fetching org:
const clientSecret   = org.google_client_secret?.startsWith('enc:')
  ? decrypt(org.google_client_secret.slice(4))
  : org.google_client_secret!
const refreshToken   = org.google_refresh_token?.startsWith('enc:')
  ? decrypt(org.google_refresh_token.slice(4))
  : org.google_refresh_token!

// Then use clientSecret / refreshToken instead of org.google_client_secret / org.google_refresh_token
```

The `enc:` prefix allows a graceful migration: encrypted and unencrypted values coexist until the migration script runs.

---

### FIX-09 — Zod validation (add to project)

**Install:** `pnpm add zod`

**Create `src/lib/validation.ts`** — shared schemas for all routes:

```ts
import { z } from 'zod'

export const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
export const ISO_MONTH = z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM')
export const PHONE_IN = z.string().regex(/^\d{10}$/, 'Must be 10 digits')
export const UUID = z.string().uuid()
export const POSITIVE_INT = z.number().int().positive()

export const TenantCreateSchema = z.object({
  room_id:       UUID,
  name:          z.string().min(1).max(100),
  phone:         PHONE_IN,
  email:         z.string().email().optional().or(z.literal('')),
  cot_number:    z.string().max(20).optional(),
  move_in_date:  ISO_DATE,
  move_out_date: ISO_DATE.optional(),
  rent_amount:   POSITIVE_INT.optional(),
})

export const TenantPatchSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  phone:         PHONE_IN.optional(),
  email:         z.string().email().optional().nullable(),
  cot_number:    z.string().max(20).optional().nullable(),
  move_in_date:  ISO_DATE.optional(),
  move_out_date: ISO_DATE.optional().nullable(),
  status:        z.enum(['active', 'inactive']).optional(),
  rent_amount:   POSITIVE_INT.optional().nullable(),
  room_id:       UUID.optional(),
})

export const PaymentCreateSchema = z.object({
  rent_record_id: UUID,
  amount:         POSITIVE_INT,
  paid_date:      ISO_DATE,
  payment_mode:   z.enum(['cash', 'online', 'cheque']).optional(),
  note:           z.string().max(500).optional(),
})

export const ExpenseCreateSchema = z.object({
  description: z.string().min(1).max(200),
  amount:      POSITIVE_INT,
  date:        ISO_DATE,
})

export const StaffCreateSchema = z.object({
  name:        z.string().min(1).max(100),
  email:       z.string().email(),
  password:    z.string().min(8),
  staff_role:  z.enum(['manager', 'staff']),
  property_id: UUID.optional().nullable(),
})
```

Usage in a route handler (replaces manual `if (!x || !y)` blocks):

```ts
import { TenantCreateSchema } from '@/lib/validation'

const parsed = TenantCreateSchema.safeParse(await request.json())
if (!parsed.success) {
  return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
}
const { room_id, name, phone, ... } = parsed.data
```

Apply these schemas in the following files (in order of risk):
1. `src/app/api/payments/route.ts` — use `PaymentCreateSchema`
2. `src/app/api/tenants/route.ts` — use `TenantCreateSchema`
3. `src/app/api/tenants/[id]/route.ts` — use `TenantPatchSchema`
4. `src/app/api/expenses/route.ts` — use `ExpenseCreateSchema`
5. `src/app/api/staff/route.ts` — use `StaffCreateSchema`

---

### FIX-11 — Minimum password length for staff

**File:** `src/app/api/staff/route.ts`

In the POST handler, add after the existing `!password` check:

```ts
if (password.length < 8) {
  return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
}
```

Same change applies to the PATCH handler (password is optional on edit, so only validate if provided):

```ts
if (password !== undefined && password.length < 8) {
  return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
}
```

---

### FIX-12 — Normalize login timing (already addressed in FIX-03)

FIX-03 replaces the entire login route and includes the `TIMING_DUMMY_HASH` pattern. No additional change needed here.

---

### Checklist for implementation session

Apply in this order (each fix is independent, but order reflects priority):

- [ ] FIX-01 — proxy.ts header stripping *(~5 min, highest impact)*
- [ ] FIX-02 — dashboard SQL column names *(~5 min, fixes broken dashboard)*
- [ ] FIX-04 — CSRF Origin check in proxy.ts *(add to same file as FIX-01)*
- [ ] FIX-06 — property_id filter on GET /api/payments *(2-line change)*
- [ ] FIX-05 — enum + date validation in tenants, payments, expenses, documents *(per-file guards)*
- [ ] FIX-07 — file type/size guards on logo and document uploads *(per-file guards)*
- [ ] FIX-03 — rate limiting (requires DB migration + schema change + full route replacement)*
- [ ] FIX-09 — install Zod, create `src/lib/validation.ts`, apply schemas route by route
- [ ] FIX-08 — encrypt OAuth tokens (requires new env var + new file + migration script)
- [ ] FIX-11 — password length check in staff route *(1-line change)*
