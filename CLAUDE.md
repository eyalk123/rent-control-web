# Rent-Control Web

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
  auto-sign-out, `mock.ts`), `auth/` (Firebase, `AuthContext`, `AuthTokenSync`,
  `ProtectedRoute`), `i18n/`, `theme/`, `monitoring/` (Sentry).
- `src/features/`: feature slices (home, properties, renters, transactions, suppliers,
  reports, notifications, settings, auth, legal). Each typically has `api/`, `components/`,
  `pages/`, `queries.ts` (React Query hooks), and `validation/` or `schemas/`.
- `src/shared/`: reusable `components/` (`form/`, `ui/`, `detail/`), `utils/`, `types/`,
  `accessibility/`, `constants/`.
- `src/layout/`: app chrome — `AppShell`, `Sidebar`, `TopBar`, `MobileBottomBar`,
  `CommandPalette`.

**Conventions:**

- Server state goes through React Query — define query/mutation hooks in each feature's
  `queries.ts`; do not fetch ad hoc in components.
- Forms = Zod schema + React Hook Form + the shared form components in
  `src/shared/components/form/`.
- Auth: a `401` response auto-signs-out the user via the Axios response interceptor in
  `src/core/api/client.ts`. Public routes (`/sign-in`, `/privacy`, `/terms`,
  `/accessibility`) render outside `ProtectedRoute`; everything else is inside `AppShell`.
- Styling: Tailwind v4 + `class-variance-authority` for component variants. RTL is driven by
  i18next language; keep layout direction-agnostic.
