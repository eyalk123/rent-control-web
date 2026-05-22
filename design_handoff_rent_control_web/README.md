# Handoff: Rent Control — Web Redesign

> **TL;DR — Read this first.**
> The user has an **existing web app** with a **working backend**. This handoff is for **refactoring the front-end** to match the new design in this package. Do **not** rewrite the backend. Do **not** assume the design's data model is correct — when the design and backend disagree, **stop and ask the user**. They have explicitly asked you to be liberal with questions.

---

## How to work with this handoff

1. **Inspect the existing codebase first.** Open the user's web project, list its routes, components, state management, styling system, and data layer. Understand what's already there before you change anything.
2. **Then read this entire README** plus the source JSX files in `design/`. The JSX in `design/` is a **design reference**, not production code — it is babel-in-the-browser JSX with inline styles, intentionally written to be read top-to-bottom as a spec. **Recreate the designs in the existing codebase's stack** (don't drop the HTML in).
3. **Catalog every mismatch you find between the design and the backend / existing code.** Examples:
   - Design assumes a field the API doesn't return (e.g. `leaseYears[]` with `kind: "Contract" | "Option"`).
   - Backend has a field/entity the design doesn't surface anywhere.
   - Naming differs (`renter` vs `tenant`, `supplier` vs `vendor`, `categoryKey` vs `category_id`).
   - Status enums don't line up (`overdue` / `expiring` / `active` may be derived in the design, but the backend may store them differently — or not at all).
   - Currency: design uses `₪` everywhere as a literal; backend may have a currency setting.
   - Date formats, timezone handling, locale strings.
   - Auth: design has Google OAuth + email/password + forgot-password; check what the backend actually supports.
4. **Ask the user about every mismatch and every ambiguity before implementing it.** Batch your questions per screen / per feature. Do not guess. The user has stated they prefer being asked many questions over you making assumptions.
5. **Confirm visual fidelity targets per screen** — the design is hi-fi but you must use the existing codebase's component library, not recreate primitives from scratch unless asked.

## Questions you must ask up front

Before touching code, please ask the user:

**Stack & infrastructure**
1. What framework/router does the existing web app use (Next.js App Router, Pages Router, Vite + React Router, Remix, something else)? What versions?
2. What styling system is in place (Tailwind, CSS Modules, styled-components, Emotion, vanilla CSS, a UI kit like shadcn/MUI/Mantine)?
3. What's the component library / design system, if any? Should I reuse those primitives or replace them with new ones built from `tokens.css`?
4. What state-management / data-fetching pattern (React Query, SWR, Redux, Zustand, server components, etc.)?
5. What's the backend (Firebase, Supabase, custom Node/Express, Rails, …)? Where's the API contract — OpenAPI, Prisma schema, GraphQL schema, or just code?
6. Is there an auth provider already wired (Firebase Auth, NextAuth, Clerk, custom)?
7. Is there an i18n setup already? The design is English-only but reserves space for RTL Hebrew.

**Design scope**
8. Should I implement **every** screen in this handoff, or a subset? In what priority order?
9. Are there existing routes/URLs I should match, or am I free to use the ones suggested below (`/`, `/properties`, `/properties/:id`, `/renters`, `/renters/:id`, `/transactions`, `/transactions/:id`, `/suppliers`, `/reports`, `/reports/income-expense`, `/reports/expense-log`, `/settings`)?
10. The design treats the sidebar layout as a user preference with three variants (`wide` / `pill` / `icon`). Keep that as a setting? Pick one?
11. Dark mode toggle: keep it, default to system, or remove?
12. The command palette (⌘K) — should I build it now or defer?
13. Keyboard shortcuts (h/P/T/X/r/S/, and p/t/R/E) — keep or drop?

**Data model mismatches you will almost certainly hit**
14. Property: design shows `parking[]`, `elecMeter[]`, `waterMeter[]`, `gasMeter[]` as arrays. Backend?
15. Renter `leaseYears[]` with `{ range, amount, kind: "Contract" | "Option", current }` — is this how leases are modelled, or is it a single date range + escalation rules?
16. Renter `status: "active" | "expiring" | "overdue"` — derived (from `leaseEnd` + balance) or stored?
17. Transaction `monthFor` (e.g. `"2026-05"`) — does the backend track which month a rent payment covers, separately from the payment date?
18. Transactions distinguish `categoryKey` (for expenses) vs `renterId` (for revenue). Is there a single `transactions` table with type-discriminated columns?
19. Suppliers: design has multi-select `categories[]` linking suppliers to expense categories. Does the backend have this relation?
20. The "bulk record revenue" path inserts N transactions in one submit — is there a bulk endpoint, or should the client loop?

**Reports**
21. Are reports generated client-side from existing transactions data, or via a backend endpoint that returns a structured payload / PDF / Excel?
22. PDF and Excel export — server-rendered or client (jsPDF / SheetJS)?

**Acceptable substitutions**
23. The design uses Lucide-style inline SVG icons. Switch to `lucide-react` package, or keep inline?
24. The design uses Inter from Google Fonts — keep, or use a local copy / system font?

Wait for answers before writing code.

---

## ⚠️ Critical UX pattern — read this before anything else

**Every "Add" and "Edit" form in this app is a right-side drawer, NOT a separate page.** This applies to:
- Add / edit **property**
- Add / edit **renter** (including the nested lease-years and extra-contacts repeaters)
- Add / edit **transaction** (single revenue + bulk revenue + expense — same drawer, different modes)
- Add / edit **supplier**

The user remains on the list or detail page they came from; the drawer slides in from the right (~620px wide, ~760px for bulk revenue), darkens the page behind with a scrim, and closes on ESC, scrim click, or Cancel/Save. **Do not** route to `/properties/new`, `/renters/:id/edit`, etc. — these are not pages.

If your existing codebase already has a Sheet / SidePanel / Drawer primitive, use it. If not, build one (see `design/shared.jsx → Drawer` for the exact spec: slide-in 220ms `cubic-bezier(.2,.7,.2,1)`, scrim `rgba(15,23,42,0.32)` with `blur(2px)`, fixed header with title + subtitle + close X, scrollable body, sticky footer with Cancel + Save).

The detail pages (`PropertyDetailPage`, `RenterDetailPage`, `TransactionDetailPage`) ARE full pages, with their own routes. Only the **forms** are drawers.

## Overview

Rent Control is a property-management app for small landlords. Users track properties, renters (with multi-year leases), revenue/expense transactions, suppliers, and generate annual reports. The original product is a React Native mobile app; this handoff is for the **web companion** which mirrors the mobile feature set on a wider canvas.

## About the design files

The files in `design/` are **design references created in HTML/JSX-via-Babel**. They are prototypes that show the intended look, layout, and interaction patterns — they are **not production React code to copy directly**.

- Tokens (`design/tokens.css`) are real CSS variables, light + dark mode. Copy these into your codebase as-is or map them to your existing token system.
- Each `pages-*.jsx` file is the canonical spec for that screen / flow.
- `shared.jsx` is the spec for shared primitives (icons, mock data, buttons, pills, drawers, modals, form fields).
- `app.jsx` shows routing + state composition.
- Inline styles in the JSX are there because the prototype runs Babel in-browser; **do not ship inline styles** — translate them to whatever styling system the existing codebase uses.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate pixel-for-pixel using the codebase's existing primitives where they exist, falling back to new components built from `tokens.css` when they don't.

---

## Screens

Below is every screen in the design. For each one: purpose, layout, components, behavior, source file. **Open the corresponding `design/pages-*.jsx` file alongside this README** — those files have the exact pixel values, copy, and edge cases.

### 1. Auth — Sign in / Register / Forgot password
**Source:** `design/pages-auth.jsx`
**Purpose:** Sign users in, create accounts, recover passwords.
**Layout:** Full viewport split horizontally. Left ~60% is a navy brand panel (`var(--rc-brand-navy)` = `#1A2D4A`) with the logo top-left, a giant editorial headline, and a decorative grid of property tiles. Right ~480px is a white card containing the form.
**Modes:** `signin` / `register` / `forgot`. The right panel swaps body, the left panel stays.
**Components:**
- "Continue with Google" button (white, outlined). Lands user on `/home`.
- Email + password inputs (sign-in / register).
- First + Last name fields (register only).
- Confirm password (register only).
- "Forgot password?" link (sign-in only) → swaps to forgot mode.
- "Reset password" form: email + send button + success toast.
- Toggle CTA at the bottom: "New here? Create account" / "Already have an account? Sign in".

### 2. Home — Dashboard
**Source:** `design/pages-home.jsx`
**Purpose:** Land here after sign-in. Show profit MTD, what needs attention, recent activity.
**Layout:** Single scrollable column. From top:
1. Context strip — greeting + date + status dot.
2. Editorial hero, 2 columns: left has uppercase eyebrow, massive 84px profit number (`net profit · MTD`), trend pill, and a 3-up split (Collected / Spent / Expected by EOM) under a 1px divider. Right is a 280px-tall cash-flow chart card (area + bars, 12 months) with a segmented control (12m / 6m / 3m).
3. Quick actions — 4 buttons grid: Record revenue / Record expense / Add renter / Add property. Each shows a single-letter keyboard hint.
4. Two-column row: Needs attention panel (overdue, expiring leases, vacant properties) + Portfolio occupancy card (navy background, big % number, property strip of colored blocks at the bottom).
5. Recent transactions — 5 rows of transactions inside a single card.

### 3. Properties — List
**Source:** `design/pages-properties.jsx` → `PropertiesPage`
**Purpose:** Browse all properties, filter, switch between cards and table views, jump to add.
**Layout:** Page header (title + meta + Export + Add property). Filter bar with search input, filter chips (Type / Owner / Status / City), and a segmented view toggle (Cards / Table) right-aligned. Content area: either responsive card grid (`minmax(320px, 1fr)`) or full-width table.
**Card spec:** 120px tinted photo strip (placeholder house glyph) with two pills top-left (status + type) and a more-menu top-right. Body: address (700 16px), city/zip with map-pin icon, 3-stat row (Rent / Renters / Size), avatar stack + renter name + lease-end date.
**Table spec:** Sticky header row (Property / Type / Owner / Renters / Rent / Lease ends / Status). Each row is a button that navigates to detail.

### 3b. Property — Add / Edit form (drawer, NOT a page)
**Source:** `design/pages-properties.jsx` → `PropertyForm`
**Container:** Right-side drawer, 620px wide. Opens from the "Add property" button on the list page or "Edit" button on the detail page. **Never navigates away.**
**Sections** (each a labeled card inside the drawer body):
1. *Basic information* — Owner select (with "+ Add new owner…"), Type, Status, Address, City, Zip.
2. *Additional details* — Size, monthly rent, beds, baths; chip-style multi-inputs for Parking / Electric / Water / Gas meter numbers; Property tax (annual); Committee fee (monthly); Inventory notes (textarea).
3. *Photo* — preset color swatch grid (8 colors) — picks the tinted thumbnail color, no photo upload.
4. *Documents* — Upload rows for Basic contract / Full contract / Land registry + an "Add custom file" button.
**Footer:** Cancel + Create property / Save changes.

### 4. Properties — Detail (4 tabs)
**Source:** `design/pages-properties.jsx` → `PropertyDetailPage`
**Tabs:** `Details` · `Renters (n)` · `Transactions (n)` · `Documents`
**Hero:** Tinted background (`property.color + "33"`). Back link → all properties. Left: property tile (84px) + status & type pills + 32px address + city/zip/owner meta line. Right: action buttons (Copy address / Edit / Add transaction). KPI strip across the hero: Monthly rent / Size / Annual revenue / Annual expenses.

- **Details tab:** 4 panels in a 2-col grid — Basic info, Utilities & numbers, Fees, Inventory notes (free-text).
- **Renters tab:** Card grid of renters living here (with mini-card click → renter detail). Empty state if none.
- **Transactions tab:** Flat list of all txs touching this property (with click → tx detail).
- **Documents tab:** 2-col — list of attached PDFs (Basic contract, Full lease, Land registry) on the left, drag-drop upload zone on the right.

### 5. Renters — List
**Source:** `design/pages-renters.jsx` → `RentersPage`
**Layout:** Header + tabbed status filter (All / Active / Expiring / Overdue) with counts in pill badges. Search + view toggle right-aligned.
**Card spec:** Avatar (with status-colored dot bottom-right), name, property address, status pill, 3-stat row (Rent / Lease ends / Pay day), red banner if balance < 0, contact strip at bottom (Call / SMS / Email buttons).

### 6. Renters — Detail (3 tabs)
**Source:** `design/pages-renters.jsx` → `RenterDetailPage`
**Tabs:** `Lease info` · `Property` · `Transactions (n)`
**Hero:** Tinted with renter `avatarColor`. Big avatar (84px), status pill + since-pill, 32px name, contact row (property / phone / email with icons). Actions: Call / SMS / Edit / Record payment. KPI strip: Monthly rent / Lease ends in / Total paid / Balance.

- **Lease info tab:** Big panel — `Lease timeline` shows a horizontal strip of lease-year cells; each cell has range (e.g. `26-27`), amount, and kind (`Contract` or `Option`). The current year is highlighted in green. Legend below. Side panels: Contact, Payment, Extra contacts (Insurance lives alongside).
- **Property tab:** Tinted summary card linking back to the property + utilities/meters/size panels.
- **Transactions tab:** Flat list of this renter's payments.

### 6b. Renter — Add / Edit form (drawer, NOT a page)
**Source:** `design/pages-renters.jsx` → `RenterForm`
**Container:** Right-side drawer, 680px wide. Opens from "Add renter" on the list or "Edit" on the detail. **Never navigates away.**
**Sections:**
1. *Basic information* — "Pick from device contacts" CTA (mobile/PWA), First + Last name, Phone, Email.
2. *Property* — single Select bound to all properties.
3. *Lease information* — Lease start date, payment type, pay day; plus a **dynamic Lease years repeater**: rows of `range / amount / kind (Contract|Option) / delete`. "Add year" button at the top of the repeater.
4. *Insurance* — Company / Policy / Expiry.
5. *Extra contacts* — dynamic repeater: rows of `name / phone / delete`. "Add contact" button.
**Footer:** Cancel + Create renter / Save changes.

### 7. Transactions — List
**Source:** `design/pages-transactions.jsx` → `TransactionsPage`
**Layout:** Page header + 2-col hero (6-month bar chart card + 3 KPI tiles stacked). Filter bar: segmented (All / Revenue / Expenses), search, filter chips (Property / Renter / Supplier / Date), right-aligned net total. Below: transactions grouped by month — each group has a sticky-ish header row with the month label and the month's totals (rev / exp / net), then a card containing the rows.

### 8. Transactions — Detail
**Source:** `design/pages-transactions.jsx` → `TransactionDetailPage`
**Layout:** 2-col. Left big tinted card (`revenue-bg` or `expense-bg`) with type pill, big amount (56px), context line, and notes block. Right `Details` panel: Property / Renter / Supplier / Category / Method / Month-for / Date — each row links the related entity. Receipt placeholder at the bottom full-width.

### 9. Transaction form — Single + Bulk
**Source:** `design/pages-transactions.jsx` → `TransactionForm`
**Container:** Right-side drawer, 640px wide (760px in bulk mode).
**Flow:**
1. Choose type — 2 big buttons (Revenue / Expense). Skipped if `drawerProps.type` is preset.
2. If Revenue → segmented `Single payment` / `Bulk · n selected`.
3. **Single revenue form:** Property + Renter (renter list filters by selected property), amount, date, month picker (12 month buttons), payment method picker (4 tile grid), notes, receipt upload.
4. **Bulk revenue form:** Shared parameters (month, date, method) on top; below, a list of every renter with checkbox + name + property + editable amount input (pre-filled with their `rent`). Footer button shows "Record N payments".
5. **Expense form:** Property + Category + Supplier (filtered by category), amount, date, method, notes, receipt.

### 10. Suppliers — List + Form
**Source:** `design/pages-suppliers.jsx`
**List:** Header (back to Transactions), Show inactive toggle, Add supplier. Search + card grid.
**Card:** Icon tile + name + phone + category pills + monospace bank account string at the bottom.
**Form (drawer, 620px):** Name / Phone / Email; Categories multi-select grid (3 cols); Bank code/branch/account (monospace inputs); Notes + Active toggle.

### 11. Reports — Hub
**Source:** `design/pages-reports.jsx` → `ReportsPage`
**Layout:** Page header. Two big report cards (Income & Expense + Expense Log) with icon + title + subtitle + 3-stat preview + "Open report" CTA. Below: Recent reports list with download/share/delete row actions.

### 12. Reports — Income & Expense
**Source:** `design/pages-reports.jsx` → `IncomeExpenseReport`
**Layout:** Header + controls (year segmented control + Group-by segmented + 3 inline KPIs on the right). Main content is a wide matrix table: Property column + 12 month columns + Total column. Rows are split into two sections (Revenue + Expenses) with colored dividers, then a Net totals row at the bottom in `var(--rc-bg)`. Below the matrix: per-property summary cards (Rev / Exp / Net).

### 13. Reports — Expense Log
**Source:** `design/pages-reports.jsx` → `ExpenseLogReport`
**Layout:** Header + year selector + custom range button. 2-col body: main table grouped by category (Date / Supplier+notes / Property / Amount), with per-category subtotal rows and a grand-total row. Right sidebar: % breakdown bars per category + dark navy summary card with the YTD expense total.

### 14. Settings
**Source:** `design/pages-settings.jsx` → `SettingsPage`
**Layout:** Page header + 2-col (anchor side-nav left, scrolling sections right).
**Sections:** Account (avatar + name + Google badge + Edit profile), Appearance (Theme / Density / Sidebar segmented controls), Language (en / he), Data & privacy (Export / Backup toggle / Currency), About (Version / Terms / Privacy / Support), **Danger zone** (Sign out + Delete account).

### 15. Delete account modal
**Source:** `design/pages-settings.jsx` → `DeleteAccountModal`
A small modal: warning icon + heading + bulleted list of what gets deleted (with live counts pulled from the data) + a type-`DELETE`-to-confirm input + danger CTA. Delete is disabled until input === `"DELETE"`.

---

## Interactions & behavior

- **Routing.** Hash-based in the prototype (`#properties`, `#propertyDetail/3`). In your app, use the codebase's router. Suggested URLs:
  - `/` (home), `/properties`, `/properties/:id`, `/renters`, `/renters/:id`, `/transactions`, `/transactions/:id`, `/suppliers`, `/reports`, `/reports/income-expense`, `/reports/expense-log`, `/settings`, `/auth` (or whatever the existing app uses for auth).
- **Drawers.** Right side, ~620px, slide-in from right (220ms, `cubic-bezier(.2,.7,.2,1)`), with a scrim. ESC + scrim click close.
- **Modals.** Center, scrim, 16px radius card.
- **Command palette (⌘K).** Modal at 12vh from top, 600px wide, search input + grouped results (Pages / Actions / Properties / Renters). ESC closes.
- **Keyboard shortcuts** (apply only when no input is focused):
  - `⌘K` palette · `h` Home · `P` Properties · `T` Renters · `X` Transactions · `r` Reports · `S` Suppliers · `,` Settings
  - `p` Add property · `t` Add renter · `R` Record revenue · `E` Record expense
- **Form validation.** Required fields marked with red asterisk. The prototype doesn't actually validate — implement per backend rules.
- **Empty states.** Each list page has an `Empty` component with icon + title + hint + optional CTA. Use them when filters return nothing or entities don't exist yet.
- **Theme.** `[data-theme="dark"]` on `<html>` swaps the entire palette. Persist preference; consider also a `system` mode.
- **Density.** `[data-density="compact|comfortable|cozy"]` on body multiplies row padding via CSS variables (see `Rent Control Web.html`).

## State management

The prototype keeps everything in component state. In production:
- **Server data** (properties, renters, transactions, suppliers): use the data layer the existing app already uses (React Query / SWR / RSC). Don't re-fetch on every navigation; cache and invalidate per mutation.
- **UI state** (drawer open, current tab, filter chips, search query): local component state, or URL query params for filters so links are shareable.
- **User preferences** (theme, density, sidebar, language, currency): persist server-side on the user profile **or** localStorage — confirm with user.

## Design tokens

See `design/tokens.css`. Key values:

**Brand**
- `--rc-brand-navy: #1A2D4A`
- `--rc-android-bg: #F1E8D6`

**Light palette**
- Primary: `#2563EB` · Primary container: `#DBEAFE` / on-container `#1E3A8A`
- Secondary: `rgba(13,148,136,1)` (teal)
- BG `rgba(241,245,249,1)` · Surface `#FFFFFF`
- FG1 `rgba(15,23,42,1)` · FG2 `rgba(100,116,139,1)` · Placeholder `rgba(148,163,184,1)`
- Outline `rgba(203,213,225,1)` · Input bg `rgba(248,250,252,1)`
- Success `rgba(5,150,105,1)` · Warning `rgba(217,119,6,1)` · Error `rgba(220,38,38,1)`
- Revenue tint bg `rgba(5,150,105,0.13)` / fg `rgba(4,120,87,1)`
- Expense tint bg `rgba(220,38,38,0.13)` / fg `rgba(185,28,28,1)`

**Dark palette** in same file under `[data-theme='dark']`.

**Type** — Inter via Google Fonts (`@import` in `tokens.css`). Headings 700, body 400, labels 500/600.

**Spacing** — `4 / 8 / 12 / 16 / 24 / 32` px.
**Radii** — `4 / 10 / 12 / 16 / 20 / 9999` px.
**Shadow** — light mode is flat (none); dark mode uses RN Paper elevation.

## Assets

- Logo glyph: inline SVG (a simple `building2` icon over navy). No raster logo asset in this handoff — if you need one, ask the user.
- Icons: ~80 Lucide-style icons defined inline as `ICON_PATHS` in `design/shared.jsx`. Recommended: install `lucide-react` and map by name.
- Property thumbnail: just a tinted house glyph generated from `property.color`. No real photos in mocks.
- Font: Inter (Google Fonts) — substituted for the iOS/Android system stack used by the mobile app.

## Files in this handoff

```
design_handoff_rent_control_web/
├── README.md                   ← this file
├── design/
│   ├── Rent Control Web.html   ← entry HTML, body styles, density rules
│   ├── tokens.css              ← color, type, spacing, radii (light + dark)
│   ├── tweaks-panel.jsx        ← in-design preference panel (skip in prod)
│   ├── shared.jsx              ← icons, mock data, AppChrome, Sidebar, TopBar,
│   │                             CommandPalette, Pill, Btn, Avatar, Drawer,
│   │                             Modal, Field/Input/Select, PropTile, etc.
│   ├── app.jsx                 ← router state, keyboard shortcuts, render switch
│   ├── pages-auth.jsx          ← sign-in / register / forgot
│   ├── pages-home.jsx          ← dashboard with cash-flow chart
│   ├── pages-properties.jsx    ← list, detail (4 tabs), add/edit drawer
│   ├── pages-renters.jsx       ← list, detail (3 tabs), add/edit drawer
│   ├── pages-transactions.jsx  ← list, detail, single+bulk add drawer
│   ├── pages-suppliers.jsx     ← list, add/edit drawer
│   ├── pages-reports.jsx       ← hub, Income/Expense matrix, Expense Log
│   └── pages-settings.jsx      ← settings sections + Delete account modal
```

## Mock data shapes (for reference — confirm against your backend)

These are the shapes the design assumes. Each one is a likely place for the design and your real backend to disagree — please diff them.

```ts
type Property = {
  id: number;
  addr: string;
  city: string;
  zip: string;
  type: "Residential" | "Commercial";
  status: "occupied" | "vacant";
  owner: string;
  color: string;               // brand-tinted thumbnail color
  sqFt: number;                // square meters, not feet
  rent: number;                // ILS
  beds: number;
  baths: number;
  parking: string[];
  elecMeter: string[];
  waterMeter: string[];
  gasMeter: string[];
  propertyTax: number;         // ILS, annual
  committee: number;           // ILS, monthly
  leaseEnd: string | null;     // YYYY-MM-DD, derived from active renter
  renters: number;             // count
  inventory: string;           // free text
};

type Renter = {
  id: number;
  name: string;
  phone: string;
  email: string;
  propertyId: number;
  rent: number;
  leaseStart: string;          // YYYY-MM-DD
  leaseEnd: string;
  balance: number;             // negative = owes
  status: "active" | "expiring" | "overdue";   // derived?
  payType: "Bank transfer" | "Cash" | "Bit" | "Check" | "Standing order" | "Wire";
  payDay: number;              // 1..31
  avatarColor: string;
  insurance: { company: string; policy: string; expiry: string } | null;
  extras: { name: string; phone: string }[];
  leaseYears: { range: string; amount: number; kind: "Contract" | "Option"; current?: boolean }[];
};

type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
  categories: string[];        // expense category keys
  active: boolean;
  notes: string;
  bank: { code: string; branch: string; account: string } | null;
};

type Transaction = {
  id: number;
  date: string;                // YYYY-MM-DD
  propertyId: number;
  renterId: number | null;     // revenue only
  supplierId: number | null;   // expense only (optional)
  categoryKey: string | null;  // expense only
  party: string;               // denormalized display name
  type: "revenue" | "expense";
  amount: number;              // ILS, positive
  method: "cash" | "bank_transfer" | "bit" | "check";
  monthFor: string | null;     // "YYYY-MM" — which month a rent payment covers
  notes: string;
};

type ReportHistory = {
  id: number;
  type: "Income & Expense" | "Expense Log";
  period: string;              // "2025" | "2025 Q4" | "Jan–Jun 2025"
  generated: string;           // YYYY-MM-DD
  format: "PDF" | "Excel";
};
```

## Final reminder

The user explicitly asked you to **ask many questions** and to **flag every mismatch between this design and the existing backend**. When in doubt, **stop and ask**. Do not make silent assumptions. Group questions per screen and present them clearly so the user can answer in one pass.
