# Rent Control — Web

Web client for **Rent Control**, a property-management app for landlords (Hebrew/RTL + English). It is the web port of the rent-control mobile app and talks to the separate FastAPI backend (`../rent-control-backend`).

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **React Router v7** (`createBrowserRouter`)
- **TanStack React Query** for server state
- **react-hook-form** + **zod** for forms/validation
- **Tailwind CSS v4** + Radix UI primitives
- **Firebase** Auth (email/password + Google) and Storage (direct browser uploads)
- **i18next** / react-i18next (en + he)
- **Recharts** for charts
- **Sentry** for production error monitoring

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:5173
```

### Environment variables

All client vars are `VITE_*` and are **inlined at build time** (Firebase web config is public by design).

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Firebase web config |
| `VITE_SENTRY_DSN` | Optional; enables Sentry in **prod builds** only |

> **Test-only flags** (never set in production): `VITE_USE_MOCK_API` (in-memory mock API) and `VITE_E2E_AUTH_BYPASS` (skips Firebase auth). They live in `.env.test` and the app **throws on startup** if they are enabled in a production build.

## Scripts

```bash
npm run dev        # dev server
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # preview the production build
npm run lint       # eslint
npm run test:e2e   # Playwright end-to-end tests (run offline via mock + auth bypass)
```

## Deployment (Railway)

The frontend is served as a static SPA via a multi-stage **Docker** build:

- `Dockerfile` — builds with Node, serves `dist/` with **Caddy**.
- `Caddyfile` — SPA history fallback, security headers (HSTS, CSP, X-Frame-Options, …), and cache headers (`immutable` for `/assets/*`, `no-cache` for `index.html`). Binds to `:{$PORT}`.
- `railway.toml` — Dockerfile builder, healthcheck `/`.

Set the `VITE_*` variables (above) as **service variables** on the Railway frontend service; the `Dockerfile` declares each as an `ARG` so Vite inlines them at build time. Set `BACKEND_ORIGIN` too — the Caddyfile injects it into the CSP `connect-src`.

After deploying, on the **backend** set `CORS_ORIGINS` to the frontend origin, and add the frontend domain to **Firebase → Auth → Authorized domains**.

### Firebase Storage rules

`storage.rules` (deployed via `firebase deploy --only storage`) restricts uploads to the owner's path, images/PDF only, ≤ 10 MB, with a default-deny.

## Accessibility & legal

- Public legal pages live under `/privacy`, `/terms`, `/accessibility` (`src/features/legal/`).
- A native accessibility panel (text size, high contrast, reduced motion) is in `src/shared/accessibility/`.
- Targets WCAG 2.0 AA / IS 5568; see `DEPLOYMENT_CHECKLIST.md` for the full pre-launch checklist.
