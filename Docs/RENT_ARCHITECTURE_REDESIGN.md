# Rent Architecture Redesign

## Context

This document captures the full problem analysis and agreed solution for the rent system. Read this before implementing anything related to rent records, payments, or billing cycles.

---

## Current Architecture (What Exists Today)

### Stack
- Next.js App Router, fully serverless (no cron jobs possible)
- PostgreSQL via Drizzle ORM
- Multi-tenant: every row scoped by `org_id` + `property_id`

### Tables Involved
- `tenants` — source of truth: `move_in_date`, `rent_amount`, `status`
- `rent_records` — one row per billing cycle per tenant: `period_start`, `period_end`, `due_date`, `amount`, `status (pending|paid)`, `paid_date`, `payment_mode`

### How It Works Today
1. Tenant is created → **no rent record is created**
2. Owner opens Collect Rent tab → triggers `POST /api/rent/generate`
3. Generate fetches all active tenants, computes current cycle using anniversary model (move-in day anchors the cycle), bulk-inserts with `onConflictDoNothing()`
4. Returns only records where `due_date` is in the **current calendar month**
5. Owner marks a record paid → `status = paid`, `paid_date`, `payment_mode` saved

### Anniversary Model (Correct, Keep This)
```
move_in_date = Jun 8
Cycle 1: Jun 8 → Jul 7
Cycle 2: Jul 8 → Aug 7
...
```
The day of the month from `move_in_date` anchors every future cycle permanently.

---

## Problems with Current Architecture

### Problem 1 — Duplicate Records on Move-In Date Edit (Bug Faced)
Owner changes Akshay's move-in from Jun 8 → Jun 7.
- Old record: `due_date = Jun 8` (already exists)
- Generate runs again: `due_date = Jun 7` (new, different key)
- `onConflictDoNothing()` does not catch it — Jun 7 ≠ Jun 8
- **Two pending records for same tenant, same month**

### Problem 2 — Rent Amount Drift
`amount` is copied from `tenant.rent_amount` at generation time and frozen. But if rent is raised after generation, the pending record still shows old amount. Owner collects wrong amount.

### Problem 3 — Silent Month Loss
If owner never opens Collect Rent in June, June's records are never created. July comes, generate runs, creates July records. June is **permanently lost** — never generated, never collected, no trace.

### Problem 4 — Overdue Records Disappear
Collect Rent filters: `due_date month = current calendar month`. A June pending record becomes invisible in July. Owner cannot see or collect it from the main screen.

### Problem 5 — No Auto-Generation on Tenant Creation
New tenant added → no rent record. Owner must remember to open Collect Rent. If they forget, first month silently lost.

### Problem 6 — Serverless Has No Cron
Cannot schedule automatic generation. Everything depends on human remembering to open a tab.

### Problem 7 — No Partial Payment Support
`rent_records.status` is binary: `pending` or `paid`. If tenant pays ₹2,000 of ₹6,000, there is nowhere to record it. Only options are: mark paid (wrong), leave pending (wrong), or lose the data.

---

## Agreed Solution

Three decisions made after discussion (cross-validated with ChatGPT):

### Decision 1 — Immutable Ledger + Backfill Generation (not Pull Model)

**Rejected: Pure Pull Model** (derive everything from move-in date, store only payments)
- Elegant but dangerous: changing move-in date rewrites all historical cycle boundaries
- Accounting systems must not let master data edits rewrite history

**Adopted: Immutable Ledger + Backfill**
- `rent_records` rows are created once and never mutated (except status)
- On every relevant trigger, run `ensureRentRecordsUpToDate()` which backfills all missing cycles from the last generated cycle up to today
- Unique constraint on `(tenant_id, cycle_start)` prevents duplicates
- Amount is snapshotted at generation time — immune to future rent changes

### Decision 2 — Pending Records Are Deletable, Paid Records Are Not

The immutability rule applies only to paid records:
- **Paid records** → completely immutable, never touch
- **Pending records** → can be deleted and regenerated when tenant data changes

So when move-in date is edited:
1. Delete all PENDING records for that tenant
2. Run `ensureRentRecordsUpToDate()` from new move-in date
3. Paid history is untouched
4. No duplicates

### Decision 3 — Add a Separate `payments` Table for Partial Payments

`rent_records` represents **expected dues** (immutable cycle entries).
`payments` represents **actual money received** (multiple entries allowed per cycle).

This supports: partial payments, split payments, advance payments.

---

## New Schema

### `rent_records` (Modified)
```
id                uuid PK
org_id            uuid
property_id       uuid
tenant_id         uuid
cycle_start       date          ← replaces period_start, unique key with tenant_id
cycle_end         date
amount_due        integer       ← snapshotted at generation time, never changes
status            text          ← computed: 'pending' | 'partial' | 'paid'
created_at        timestamp
```

Remove from rent_records: `due_date`, `paid_date`, `payment_mode`, `amount` (rename to `amount_due`)

Unique constraint: `(tenant_id, cycle_start)`

### `payments` (New Table)
```
id                uuid PK
org_id            uuid
property_id       uuid
tenant_id         uuid
rent_record_id    uuid FK → rent_records.id
amount            integer       ← actual amount received
paid_date         date
payment_mode      text          ← cash | online | cheque
note              text          ← optional, e.g. "partial, remaining in 15 days"
created_at        timestamp
```

### Status Computation
```
sum(payments.amount) >= rent_record.amount_due  → 'paid'
sum(payments.amount) > 0                        → 'partial'
else                                            → 'pending'
```

Status on `rent_records` should be kept as a stored/cached field and updated whenever a payment is added, for query performance.

---

## `ensureRentRecordsUpToDate(org_id, property_id, tenant?)` Logic

```
1. Fetch all active tenants (or single tenant if specified)
2. For each tenant:
   a. Find their latest existing rent_record (MAX cycle_start)
   b. If none → start from move_in_date
   c. Compute all expected cycles from (latest + 1 cycle) up to current cycle
   d. Insert missing cycles with:
        cycle_start, cycle_end  ← anniversary model calculation
        amount_due              ← tenant.rent_amount at this moment (snapshot)
        status                  ← 'pending'
3. Use INSERT ... ON CONFLICT (tenant_id, cycle_start) DO NOTHING
```

Anniversary model for cycle computation:
```
day = move_in_date.day
cycle_start = (year, month, day)
cycle_end   = (year, month+1, day-1)
```

---

## Triggers for `ensureRentRecordsUpToDate()`

| Event | Action |
|---|---|
| Tenant created | Run for that tenant |
| Tenant move-in date edited | Delete PENDING records for tenant → Run for tenant |
| Collect Rent tab opened | Run for all active tenants in property |
| Dashboard loaded | Run for all active tenants in property |

---

## API Changes Required

### `POST /api/tenants` (create tenant)
After inserting tenant, call `ensureRentRecordsUpToDate()` for the new tenant.

### `PATCH /api/tenants/[id]` (edit tenant)
If `move_in_date` changed:
  1. Delete all PENDING `rent_records` for this tenant
  2. Call `ensureRentRecordsUpToDate()` for this tenant

### `POST /api/rent/generate` → replace with `POST /api/rent/ensure`
New endpoint runs `ensureRentRecordsUpToDate()` for all active tenants in property. Returns all current + overdue pending/partial records (no calendar month filter — show ALL unpaid cycles).

### `POST /api/payments` (new)
Creates a payment entry for a rent_record. After insert, recomputes and updates `rent_record.status`.

Body: `{ rent_record_id, amount, paid_date, payment_mode, note? }`

Validation:
- `amount` must be > 0
- `amount` must not exceed remaining balance (`amount_due - sum(existing payments)`)
- `rent_record` must belong to same `org_id`

### `GET /api/rent` (modify)
Remove the `TO_CHAR(due_date, 'YYYY-MM') = current month` filter.
Return ALL pending and partial records, ordered by cycle_start ASC.
Include payment summary per record: `amount_paid`, `balance`.

---

## UI Changes Required

### Collect Rent Tab
- Remove "Refresh / Generate" button (or rename to "Sync" — triggers ensure)
- Show ALL unpaid cycles (not just current month) — overdue ones clearly marked
- Each card shows: `amount_due`, `amount_paid` (if partial), `balance`
- "Mark Paid" → opens a bottom sheet to record payment amount, mode, note
  - Default amount = remaining balance (full payment)
  - Can be edited down for partial payment
  - Adds a row to `payments` table

### Tenant Detail — Rent Tab
- Show full rent history with payment breakdown per cycle
- Partial cycles show: ₹2,000 paid of ₹6,000 due · ₹4,000 remaining

---

## Migration Plan for Existing Data

1. Add `payments` table
2. For each existing `rent_record` with `status = paid`:
   - Insert one row into `payments`: `amount = rent_record.amount`, `paid_date = rent_record.paid_date`, `payment_mode = rent_record.payment_mode`
3. Rename `rent_records.amount` → `amount_due`
4. Remove `rent_records.due_date`, `paid_date`, `payment_mode` (now in payments)
5. Add `amount_paid` computed/cached column or compute on read
6. Run `ensureRentRecordsUpToDate()` for all active tenants to backfill any missing cycles

---

## What Does NOT Change

- `tenants` table structure — unchanged
- `rooms` table — unchanged
- Anniversary model cycle calculation — unchanged, just moved into `ensureRentRecordsUpToDate()`
- Bill generation — reads from rent_records + payments instead of just rent_records
- Multi-tenant scoping — unchanged
