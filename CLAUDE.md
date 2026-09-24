# RentVance Web

React + Vite web client for the property-management product. English + Hebrew (RTL).
Multi-tenant: all data is scoped to the authenticated owner.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7 (`createBrowserRouter`, lazy
routes), TanStack React Query (server state), React Hook Form + Zod, Radix UI + Tailwind v4
(CVA for variants), Axios, Firebase Auth (email/password + Google), i18next, Recharts,
Sentry (prod only). Backend: FastAPI.

**Commands:**

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — `tsc -b && vite build` (type-check + production build)
- `npm run lint` — ESLint
- `npm run preview` — serve the built `dist/`
- `npm run test:e2e` / `npm run test:e2e:ui` — Playwright (the only test layer). Uses
  `.env.test` with `VITE_USE_MOCK_API` + `VITE_E2E_AUTH_BYPASS` (mock API + auth bypass).
- Env vars: copy `.env.example` to `.env` (`VITE_API_URL`, `VITE_FIREBASE_*`, optional
  `VITE_SENTRY_DSN`).

**Directories & Alias:**

- `@` resolves to `src` (`vite.config.ts`). Import as `@/core/...`, `@/features/...`,
  `@/shared/...` — **note this differs from the mobile app, where `@` is the repo root and
  imports are `@/src/...`.**
- `src/core/`: infrastructure — `api/` (Axios `client.ts` with auth-token getter + 401
  auto-sign-out, `mock.ts`, `clientHeaders.ts`), `auth/` (Firebase, `AuthContext`,
  `AuthTokenSync`, `ProtectedRoute`), `i18n/`, `monitoring/` (Sentry).
  - `clientHeaders.ts` sends `X-Client-App`/`-Platform`/`-Version` on every request so the
    backend can tell this app from the mobile one (`owner_client_days`). Both are `'web'`
    here; the version is the short commit SHA that `vite.config.ts` also cuts the Sentry
    release from, so a usage row and a Sentry issue name the same build. **Anything else
    that talks to the API without going through the Axios instance must spread
    `CLIENT_HEADERS` in too** — `features/agent/api/agentStream.ts` does, because sending
    an agent message counts as real work and would otherwise be attributed to no client.
- **The palette lives in `src/index.css`** — CSS custom properties on `:root` and
  `[data-theme="dark"]`, surfaced to Tailwind through the `@theme inline` block below them.
  That file is the only source of truth. There is no TypeScript colour module here, and
  nothing imports one.
  - **The web palette has deliberately diverged from mobile, and is not kept in sync.** Web
    is a near-neutral dark (`#121212` page, `#1E1E20` surface) with a Tailwind-derived accent
    set; mobile is the "Landlord Ink" navy-cast charcoal. They are different products
    visually and that is intentional.
  - A `src/core/theme/` directory used to hold a hand-copied snapshot of the mobile tokens
    (`colors.ts`, `spacing.ts`) plus a `cssVars.ts` that turned them into CSS variable
    blocks. **Nothing ever imported any of it** — the app rendered from `index.css` the whole
    time, while the copy sat there with a "keep in sync manually" header telling everyone it
    was authoritative. It was deleted on 2026-09-11 rather than reconciled, because
    reconciling would have meant overwriting this app's palette with a different product's.
    Do not recreate it: to change a colour here, edit the variable in `index.css`.
  - Mobile's palette rationale, its accepted deviations, and the log of proposals considered
    and declined live in **`rent-control/MOBILE-DESIGN.md`** §2 (Color) and §13 (Decisions
    log). Read it for reasoning worth borrowing, not for values to copy.
- `src/features/`: feature slices (home, properties, renters, transactions, suppliers,
  reports, notifications, settings, auth, legal, alerts, document-scan, agent,
  onboarding). Each
  typically has `api/`, `components/`, `pages/`, `queries.ts` (React Query hooks), and
  `validation/` or `schemas/`.
  - `onboarding/` is the guided tour. `registry.ts` holds the tour/step structure (copy
    lives in i18n under `onboarding.*`), `types.ts` is byte-identical to the mobile repo's
    so both platforms share tour and seed IDs, `AnchorRegistry` lets a component claim an
    anchor key, `TourController` decides which tour runs, and `TourOverlay` draws it with a
    Radix Popover. Progress is stored per account (`/users/me/tour-state`), so a tour seen
    on the phone does not reappear here. **The content is unfinished, so `flags.ts` keeps
    the whole feature off by default: on under `npm run dev`, off in every build unless
    `VITE_ONBOARDING_TOURS=on` (forwarded by the Dockerfile, so production is switched on
    with a Railway variable rather than a code change). `rentvanceTours(true)` in the
    browser console is a per-browser override that outranks both and works against a
    deployed build.** Playwright is off by default too; `enableTours` uses that same
    override — see `e2e/onboarding.spec.ts`.
  - `agent/` is the "Ask RentVance" assistant: a `Drawer` (`PortfolioChatPanel`) mounted
    once in `AppShell` and opened from `TopBar`, streaming SSE from `POST /agent/chat` via
    `api/agentStream.ts` (plain `fetch`, not Axios — Axios can't stream). Read-only: it
    answers and cites, it never mutates. The launcher only renders when
    `useAgentStatus()` reports enabled.
- `src/shared/`: reusable `components/` (`form/`, `ui/`, `detail/`), `utils/`, `types/`,
  `accessibility/`, `constants/`.
- `src/layout/`: app chrome — `AppShell`, `Sidebar`, `TopBar`, `MobileBottomBar`,
  `CommandPalette`, `navConfig.ts`. `AppShell` is where every app-global provider and
  overlay is mounted (alerts panel, scan surfaces, chat panel, transaction drawer,
  onboarding tour). Note that all three navigation variants — wide sidebar, icon sidebar,
  bottom bar — are in the DOM at every width and only hidden by breakpoint classes, so
  anything that measures a nav item must resolve to the visible one.

**Conventions:**

- Server state goes through React Query — define query/mutation hooks in each feature's
  `queries.ts`; do not fetch ad hoc in components.
- Forms = Zod schema + React Hook Form + the shared form components in
  `src/shared/components/form/`.
- Auth: a `401` response auto-signs-out the user via the Axios response interceptor in
  `src/core/api/client.ts`. Public routes (`/`, `/pricing`, `/contact`, `/sign-in`,
  `/privacy`, `/terms`, `/accessibility`, `/refunds`, `/licenses`, `/pay`) render outside `ProtectedRoute`; everything else
  is inside `AppShell`.
  - `/` is `LandingGate`: the marketing page for visitors, a redirect to `/home` for a
    signed-in user. The protected subtree is therefore a **pathless layout route** and its
    children carry absolute paths — that is what frees `/`. Adding a protected page means
    adding it there with a leading slash.
  - `features/marketing/` holds the public sales pages (landing, pricing, contact).
    `tiers.ts` is display-only
    pricing: the amounts actually charged come from the store or payment provider that sold
    the subscription, never from there. It exists so a logged-out visitor, a Paddle
    underwriter and an App Review reviewer can all see what the product costs.
    `/contact` serves the same audience: Paddle requires a contact route reachable from the
    homepage, which an address buried in the policy documents does not satisfy. It reads
    `CONTACT_EMAIL` from `features/legal/legalContent.ts` rather than restating it.
    `public/robots.txt` allows these pages and lists only the authenticated routes — extend
    that list when adding a protected page.
  - `/pay` is Paddle's **default payment link**. Paddle's dunning and "update payment method"
    emails land there with `?_ptxn=…`, and Paddle.js opens the checkout by itself. It has to
    stay public: a sign-in redirect would drop `_ptxn` and failed-renewal recovery would do
    nothing. It loads Paddle.js on that page only, reads `VITE_PADDLE_CLIENT_TOKEN` (a public
    client-side token, declared as a Dockerfile build arg), and needs Paddle's domains in the
    `Caddyfile` CSP.
  - `/plans` (protected) is the plan picker, and the only place a purchase starts. Checkout
    is RevenueCat's Web SDK (`@revenuecat/purchases-js`, imported on demand in
    `features/subscription/checkout.ts`) with Paddle underneath, configured with
    `VITE_REVENUECAT_PUBLIC_KEY` (the Paddle app's public key; Dockerfile build arg) and the
    **Firebase UID as the app user id**, which is what the webhook reads as the account.
    Packages come from the `default` offering as `<plan>_<period>`. A finished checkout sets
    `?checkout=pending` and polls `/subscription` until the webhook has changed the plan.
    Without the key the buy buttons render disabled. RevenueCat's domains are in the CSP.
  - `/licenses` is built from `public/third-party-notices.txt` at build time by
    `build-plugins/thirdPartyNotices.ts`. That file is regenerated with
    `node scripts/generate-third-party-notices.mjs` (after `npm ci` here and in
    `../rent-control`), which copies each client package's own LICENSE/LICENCE/COPYING
    file into it and lists the packages that ship none in
    `scripts/third-party-notices-missing.txt`. Only those, and the backend packages, fall
    back to the SPDX texts in `build-plugins/license-texts/`, labelled as standard text on
    the page. The build fails if the file stops parsing or a fallback names a license with
    no SPDX text there — add the SPDX file, do not relax the check.
  **One exception:** `features/agent/api/agentStream.ts` uses raw `fetch`, so it misses that
  interceptor and throws a typed `AgentHttpError` instead — any other streaming call must
  handle its own `401`/`429`/`503` the same way.
- Styling: Tailwind v4 + `class-variance-authority` for component variants. RTL is driven by
  i18next language; keep layout direction-agnostic.
