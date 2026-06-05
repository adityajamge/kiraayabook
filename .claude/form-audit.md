# Form Audit — KiraayaBook

Audited: June 2026

This document lists every form in the application, its fields, and the specific issues found. Fix these before shipping.

---

## 1. Add Tenant — `src/app/dashboard/tenants/page.tsx`

| Field | Issue |
|-------|-------|
| **Phone** | Missing `type="tel"`, `inputMode="numeric"`, and `maxLength`. User can type letters and symbols. Regex `/^\d{10}$/` validates at submit but error only shown as toast, not inline under the field. |
| **Name** | No `maxLength`. Accepts numbers, symbols, emojis. No minimum length check. |
| **Email** | `type="email"` present — OK. No trimming before submit. |
| **Room** | No issue — select dropdown. |
| **Cot Number** | No `maxLength`. No format validation. Accepts anything. |
| **Rent Amount** | `type="number"` but no `min`, no `max`. User can enter 0, negative, or 99999999. |
| **Move-in Date** | No `max` to prevent far-future dates. No `min` to prevent extreme past dates. |
| **Move-out Date** | No validation that it comes after move-in date. User can set move-out before move-in. |

**Other:** No inline field-level error messages — all errors are toast-only.

---

## 2. Edit Tenant — `src/app/dashboard/tenants/[id]/page.tsx`

| Field | Issue |
|-------|-------|
| **Phone** | **No regex validation at all** — only checks non-empty. Can save `"abc"` or `"12345"` as a phone. Missing `type="tel"`, `inputMode="numeric"`, `maxLength`. |
| **Name** | No `maxLength`. No character restrictions. |
| **Email** | `type="email"` — OK. |
| **Rent Amount** | `type="number"`, `min="0"` present — but allows 0 rent which may be unintentional. No upper `max`. |
| **Move-in / Move-out Date** | Same as Add Tenant — no ordering check, no min/max. |
| **Status** | Dropdown — OK. |

**Other:** Save button disabled check only covers name, phone, room — not date validity.

---

## 3. Rooms — `src/app/dashboard/rooms/page.tsx`

| Field | Issue |
|-------|-------|
| **Room Number** | No `maxLength`. No format check (alphanumeric only). No duplicate check in the form — server returns error but no user-friendly message displayed. |
| **Capacity** | `type="number"`, `min="1"` present — OK. But no `max`. User can enter capacity of 9999. |
| **Floor** | Free text, no `maxLength`. Accepts anything. |
| **Type** | Dropdown — OK. |

**Other:** On save failure, `handleSave` doesn't check `res.ok` — silently fails if API returns error.

---

## 4. Expenses — `src/app/dashboard/expenses/page.tsx`

| Field | Issue |
|-------|-------|
| **Description** | No `maxLength`. Accepts unlimited text. |
| **Amount** | `min="1"` present — good. No `max` upper limit. User can enter ₹999999999. |
| **Date** | No validation preventing future dates. Expenses should only be logged for today or the past. |

**Other:** Validation is relatively good here — amount NaN/<=0 check exists. Main gap is future date and no max amount.

---

## 5. Settings — `src/app/dashboard/settings/page.tsx`

| Field | Issue |
|-------|-------|
| **PG Name** | No `maxLength`. No required validation — can be saved empty. |
| **Owner Name** | No `maxLength`. Accepts symbols, numbers, anything. |
| **Phone** | **Worst case** — plain `type="text"`, zero validation, no length limit, accepts letters/symbols/emojis. This number appears on bills sent to tenants. |
| **Address** | No `maxLength`. Accepts unlimited text. |
| **Bill Notes** | No `maxLength`. Unlimited text goes onto printed bills. |

**Other:** No required field enforcement — form can be saved completely empty. No feedback on required fields.

---

## 6. Login — `src/app/login/page.tsx`

| Field | Issue |
|-------|-------|
| **Email** | `type="email"` — OK. No trim before submit. |
| **Password** | No `minLength`. No client-side validation at all. |

**Other:** Low risk since this is an internal tool, but worth adding trim and minLength.

---

## 7. Document Upload — `src/app/dashboard/documents/page.tsx`

| Field | Issue |
|-------|-------|
| **Tenant** | Select dropdown — OK. |
| **Doc Type** | Dropdown — OK. |
| **File** | `accept="image/*,.pdf"` set — good. But no file size limit enforced client-side (server may or may not enforce). |

**Other:** Relatively clean. Add a client-side file size check (e.g., 5MB max) before upload.

---

## 8. Rent Payment — `src/app/dashboard/tenants/page.tsx` & `rent/page.tsx`

| Field | Issue |
|-------|-------|
| **Payment Mode** | Dropdown — OK. |

**Other:** No issues. Simple single-field form.

---

## Priority Order for Fixes

1. **Settings phone** — goes on tenant bills, currently accepts garbage
2. **Edit Tenant phone** — no regex validation at all
3. **Move-out before move-in** — data integrity issue
4. **Add/Edit Tenant name** — no length or character validation
5. **Rent Amount max** — no upper limit
6. **Rooms: silent save failure** — `res.ok` not checked
7. **Expenses future date** — minor UX issue
8. **Document upload file size** — UX only, server handles it

---

## Fix Checklist

For each field fix, verify:
- [ ] Correct `type` attribute (`tel`, `email`, `number`, `date`)
- [ ] `inputMode` for mobile keyboard (`numeric`, `decimal`)
- [ ] `maxLength` on text inputs
- [ ] `min` / `max` on number and date inputs
- [ ] Inline error message under field (not just toast)
- [ ] `onChange` strips invalid characters where appropriate
- [ ] Submit handler trims text values
- [ ] Submit button disabled while form is invalid

See form rules: `C:\Users\adity\.claude\projects\d--Projects-kiraayabook\memory\form_rules.md`
