# Rent Control Web — E2E Test Harness & Findings Report

This document accompanies a new Playwright E2E suite (`/e2e`). It records the bugs and
improvement opportunities surfaced both by the running tests and by reviewing the code
while writing them. **Nothing here has been fixed** — this is a report for you to triage.

- Suite status: **42 passed, 1 skipped** (the skip is an intentional `test.fixme` that documents finding #2 below).
- Run with: `npm run test:e2e` (headless) or `npm run test:e2e:ui` (interactive).

---

## How the harness works

The app is gated behind Firebase auth and normally talks to the production backend, so the
suite runs the app in a deterministic, offline **test mode**:

- Playwright's `webServer` boots `vite --mode test`, which loads **`.env.test`**.
- `.env.test` sets `VITE_USE_MOCK_API=true` (use the in-memory mock data layer) and
  `VITE_E2E_AUTH_BYPASS=true` (skip Firebase, start "signed in").
- The mock data resets to seed on every full page load → clean per-test isolation.
- Tests run at a 1600×900 viewport so the labelled (`2xl`) sidebar is the visible nav.

### Test-only app changes made to enable this (all env-gated, ship-safe)

These default OFF when the env vars are unset, so dev/prod behaviour is unchanged
(verified: `npm run build` passes and the real Firebase + API path is untouched):

| File | Change |
|---|---|
| `src/core/api/mock.ts` | `USE_MOCK_API` now reads `VITE_USE_MOCK_API` (was hardcoded `false`). Also made the **transactions** mock stateful (create/update/delete now persist) and added a `getSummary()` that computes 6-month buckets — previously transaction create/delete were no-ops and `/summary` returned empty, which would have made transaction and reports tests impossible. These mock gaps are mock-only and never affected production. |
| `src/features/transactions/api/transactions.ts` | Mock branches wired to the now-stateful mock methods. |
| `src/core/auth/AuthContext.tsx` | When `VITE_E2E_AUTH_BYPASS==='true'`, provides a fake signed-in user instead of subscribing to Firebase. |

---

## Findings

Severity: **High** = blocks a core flow / crash · **Medium** = wrong behaviour or notable UX gap · **Low** = polish.
"Reproduced" = a test demonstrates it; "Static" = found by code review.

### 🔴 High

> **✅ H1, H2 and M1 are FIXED** (see "Resolved" notes inline). Fix: optional schema fields in
> `propertyValidation.ts` / `renterValidation.ts` now tolerate `undefined`, the drawers give their
> Controller fields real `''` defaults, and the renter drawer's "Next" validates step-1 fields.
> Regression tests cover all three; `npm run test:e2e` is green (42 passed, 0 skipped).

**H1 — A property cannot be created without selecting an Owner, and nothing says Owner is required.** *(Reproduced — ✅ Fixed)*
- Where: `src/features/properties/pages/PropertyFormDrawer.tsx` (form `defaultValues`, ~line 55 — `propertyOwner` is absent) + `src/features/properties/validation/propertyValidation.ts:26` (`propertyOwner: z.string()...`).
- What happens: the `propertyOwner` Creatable-Select has no default, so its value is `undefined`. `z.string()` rejects `undefined` → a generic **"Required"** appears under Owner on step 2, and `Save` silently does nothing. Owner is otherwise presented like an optional field (no asterisk).
- Impact: confusing dead-end on the primary "add property" flow.
- Fix: give `propertyOwner` a default of `''` (in `defaultValues` and/or make the schema `.optional().default('')`). Apply the same to any other Controller-backed "optional" string field.
- **✅ Resolved:** `propertyValidation.ts` optional fields now use `z.string().optional().transform(v => (v ?? '').trim())`, and `PropertyFormDrawer.tsx` defaults `propertyOwner: ''`. A property can now be created with just address/city/type.

**H2 — A renter cannot be created through the UI: the "Payment day" wheel never commits its value.** *(Reproduced — ✅ Fixed)*
- Where: `src/shared/components/form/WheelDatePicker.tsx` (it shows `01` via `parseValue` default but only calls `onChange` on scroll) + `src/features/renters/pages/RenterFormDrawer.tsx` (`defaultValues`, line 45 — `propertyId`, `paymentType`, `paymentDayOfMonth` absent) + `src/features/renters/validation/renterValidation.ts:33,37,40`.
- What happens: even after filling name/phone, selecting a property and a payment type, `Save` is blocked with **"Required"** under Payment day — because `paymentDayOfMonth` stays `undefined` (the wheel displays "01" but never writes it to the form) and the schema validates it as `z.string()`. `propertyId` and `paymentType` share the same `undefined`-default root cause.
- Impact: renter creation is effectively impossible from the UI without scrolling the wheel; the most important create flow is broken.
- Fix: have `WheelDatePicker` emit its initial value on mount (or treat the displayed value as committed), and give the Controller fields real defaults / make the schema tolerate `undefined`.
- **✅ Resolved:** chose the "make the schema tolerate `undefined`" route — `renterValidation.ts` optional fields (`propertyId`, `paymentType`, `paymentDayOfMonth`, `leaseStart`, …) now coerce `undefined → ''`, and `RenterFormDrawer.tsx` defaults those Controllers to `''`. A renter can now be created with just first/last/phone. (`WheelDatePicker` was intentionally left as-is — auto-committing its default would silently set every renter's lease-start to today, since it serves both date and day modes; these fields are genuinely optional.)

> H1 and H2 were the **same root cause**: Controller-backed fields default to `undefined`, and several `z.string()` schema fields reject `undefined`. Fixed systemically by hardening the shared `optionalString` / `optionalNumericString` helpers in both validation files.

### 🟠 Medium

**M1 — Required step-1 fields are only validated on the final (step 2) submit, so the errors are invisible.** *(Reproduced — ✅ Fixed)*
- Where: `RenterFormDrawer.tsx` (the renter "Next" button advanced with no validation; the property drawer already validated address/city/type on "Next").
- What happened: you could advance to step 2 with empty first/last/phone; pressing `Save` set errors on step-1 fields that were no longer mounted, so the user saw nothing happen.
- **✅ Resolved:** the renter "Next" now runs `trigger(['firstName','lastName','phone'])` and only advances when valid, so required errors appear inline on step 1 (matching the property drawer). Covered by the "Next validates step-1 required fields inline (M1)" regression test.

**M2 — Occupancy status is derived from a different field than the renter data shown.** *(Static — visible in test snapshots: every seeded property rendered "Vacant" despite listing renters.)*
- Where: `src/features/properties/pages/PropertiesListPage.tsx:67,174` (`StatusPill hasRenters={!!property.hasRenters}`) vs. the card body which reads `property.renters`.
- What happens: the pill keys off `property.hasRenters` while the card lists `property.renters[0]`. When `hasRenters` is absent/false the property shows "Vacant" even though it has renters. Confirm the backend always populates `hasRenters`; otherwise derive it from `renters?.length`.

**M3 — Avatar-initials code can crash on an empty name.** *(Static)*
- Where: `PropertiesListPage.tsx:103`, `RentersListPage.tsx:56` and `:152` — `(first_name[0] + last_name[0]).toUpperCase()`.
- What happens: if either name is an empty string, `''[0]` is `undefined`, `undefined + undefined` is `NaN`, and `NaN.toUpperCase()` throws — crashing the card/row. Seed data all has names so it doesn't trigger today, but any renter with a blank name (e.g. an import) would break the list.
- Fix: guard, e.g. `[first_name?.[0], last_name?.[0]].filter(Boolean).join('').toUpperCase()`.

**M4 — Blob URLs are created for image previews but never revoked (memory leak).** *(Static)*
- Where: `PropertyFormDrawer.tsx:94` (`URL.createObjectURL(file)`), and the receipt preview in `TransactionFormDrawer.tsx`.
- Fix: `URL.revokeObjectURL(...)` on change/unmount (e.g. in a `useEffect` cleanup).

### 🟡 Low / polish

- **L1** — React console warning: "Select is changing from uncontrolled to controlled" on the property **Type** select (its value starts `undefined`). Give it a default. (`PropertyFormDrawer.tsx`, `FormSelect`.)
- **L2** — Stray `console.error` left in production form drawers: `PropertyFormDrawer.tsx:144`, `RenterFormDrawer.tsx:125`, `SupplierFormDrawer.tsx:85`. Gate behind `import.meta.env.DEV` or remove.
- **L3** — List/search inputs filter on every keystroke with no debounce (e.g. `TransactionsListPage.tsx`). Fine for mock data; add a debounce for the real API.
- **L4** — Cards are keyboard-activatable with Enter but not Space (`PropertyCard`/`RenterCard` `onKeyDown`). Add Space for a11y parity.
- **L5** — `bank_account` is split on `/` assuming a `code/branch/account` shape (`SupplierFormDrawer.tsx:50-51`); malformed data is only partially guarded. Low risk but worth validating.
- **L6** — `README.md` is the stock Vite template — no setup/env/run docs.

---

## Coverage delivered

| Spec | Covers |
|---|---|
| `e2e/smoke.spec.ts` | Every route loads signed-in, no route-error boundary, no uncaught errors; sidebar navigation. |
| `e2e/properties.spec.ts` | List, search, **create round-trip**, empty-submit validation. |
| `e2e/renters.spec.ts` | List, search, validation, **documents the create blocker (H2)** + `fixme` for the intended create. |
| `e2e/suppliers.spec.ts` | List, search, validation, **create + edit + deactivate round-trips**. |
| `e2e/transactions.spec.ts` | List + KPIs, type filter, search, detail, **delete round-trip**, add-drawer type chooser. |
| `e2e/reports.spec.ts` | Hub, navigate to income/expense report, expense log. |
| `e2e/home.spec.ts` | Greeting, dashboard sections, recent transactions, occupancy. |
| `e2e/settings.spec.ts` | Sections render, **English→Hebrew flips layout to RTL**, signed-in user shown. |

### Not yet covered (suggested next)
- Full **revenue** create (the bulk period/property/renter flow in `TransactionFormDrawer`) — heavy multi-step UI; left for a follow-up.
- Property/renter **edit & delete** round-trips (need the detail-page flows; blocked partly by H1/H2 for re-create).
- Mobile/`lg` breakpoint layouts (icon sidebar + bottom bar).
