# Rent Control Web — Deployment Readiness Checklist

## Context

We are preparing the **first production deployment** of `rent-control-web` — a React 19 + TypeScript + Vite SPA (Hebrew/RTL, i18n en/he) that is the web port of the rent-control mobile app. It authenticates with **Firebase Auth**, uploads documents/receipts **directly to Firebase Storage** from the browser, and talks to a separate **FastAPI backend** (already deployed on **Railway** via Nixpacks). The frontend is also intended to be hosted on **Railway**.

The app stores **personal data of third parties** (tenant names, phones, emails, lease terms, bank/financial info) entered by landlords. That raises the bar on both security and legal compliance.

This doc is the complete checklist of work remaining before we can deploy: code bugs, infrastructure, security, legal, and polish. Items are grouped by severity. Each names the concrete file(s) to touch.

**Verified facts (correcting earlier assumptions):**
- `.env` is **not** committed — only `.env.example` and `.env.test` are tracked (`git ls-files` confirmed). No key rotation / history scrub needed. Firebase web config is public by design.
- Mock API (`VITE_USE_MOCK_API`) and E2E auth bypass (`VITE_E2E_AUTH_BYPASS`) are both **off by default** and only enabled via `.env.test`. They are correctly gated; the risk is purely "don't set those vars in the prod environment."
- Backend CORS currently allows **only** `http://localhost:5173` (`rent-control-backend/app/main.py:10`).
- Backend already runs on Railway (`rent-control-backend/railway.toml`, healthcheck `/health`, Nixpacks). `DEFAULT_CURRENCY=ILS` is intentional and matches the frontend — currency being fixed to ILS is by design, not a bug.

---

## BLOCKERS — must be done before the site can work / is safe in production

### B1. Backend CORS does not allow the production web origin
- **File:** `rent-control-backend/app/main.py:8-14`
- Today: `allow_origins=["http://localhost:5173"]`. The deployed web app's browser requests will be **blocked by CORS** → the entire app is non-functional in prod.
- **Action:** Make origins env-driven and include the production web domain (and keep localhost for dev). Example:
  ```python
  allow_origins=settings.CORS_ORIGINS  # e.g. ["http://localhost:5173", "https://<web>.up.railway.app", "https://app.yourdomain.com"]
  ```
  Add `CORS_ORIGINS` to `app/config.py` (parse comma-separated env) and set it in Railway.
- **Mobile note:** CORS is a browser-only mechanism. The native mobile app does not send `Origin`/preflight, so tightening CORS to specific web origins does **not** affect mobile. Do **not** revert to `["*"]` — `allow_credentials=True` with `"*"` is invalid and insecure.

### B2. Frontend has no real production static-serving config for Railway
- **Files:** `public/_redirects` (Netlify-only, ignored on Railway), `vite.config.ts`, repo root (no Dockerfile).
- Railway will not honor `public/_redirects`. A Vite SPA needs: (a) **history fallback** (every unknown path → `index.html`) or deep links/refreshes 404; (b) **security headers**; (c) **cache headers**.
- **Action:** Add a static server to the repo. Recommended: a multi-stage **Dockerfile** that builds with Node then serves `dist/` with **Caddy** (simplest for SPA fallback + headers) or nginx. Add a `railway.toml` mirroring the backend's pattern. Caddy sketch:
  ```
  :{$PORT}
  root * /srv
  encode gzip
  try_files {path} /index.html
  file_server
  header { ...security headers (see B4)... }
  header /assets/* Cache-Control "public, max-age=31536000, immutable"
  header /index.html Cache-Control "no-cache"
  ```
- Once this works, **delete `public/_redirects`** (or leave it harmless) to avoid confusion.

### B3. Verify & lock Firebase Storage security rules
- **File:** `src/shared/utils/firebaseUpload.ts` (uploads go **directly browser → Storage**, path `${entityType}/${ownerId}/${uuid}/${file.name}`). No `storage.rules` file exists in either repo, so rules live only in the Firebase console.
- Because uploads are client-direct, **Storage security rules are the only thing standing between an authenticated user and arbitrary read/write of the whole bucket.**
- **Action:** Confirm rules in Firebase console (export a `storage.rules` into the repo for version control). Rules should: require `request.auth != null`; restrict writes to the user's own `ownerId` path; cap `request.resource.size` (e.g. ≤ 10 MB); restrict `request.resource.contentType` to images/PDF. If rules are currently open/test-mode, this is a data-exfiltration blocker.

### B4. No security headers anywhere
- **Files:** none today (no `netlify.toml`/`vercel.json`/headers config). To be set in the B2 static server.
- This app handles personal + financial data over the web with zero hardening headers.
- **Action:** Set at minimum: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a **Content-Security-Policy**. CSP `connect-src` must include the Railway backend URL + Firebase endpoints (`*.googleapis.com`, `*.firebaseio.com`, the auth domain, the storage bucket); `script-src 'self'`; `img-src 'self' https: data:`. Start in report-only if unsure, then enforce.

### B5. Production environment variables must be set on Railway (and test-only vars must NOT be)
- **Files:** `.env.example`, `src/core/api/client.ts:8`, `src/core/auth/firebase.ts`.
- Vite inlines `VITE_*` at **build time**, so these must be present in Railway's build environment, not just runtime.
- **Action:** In Railway frontend service set: `VITE_API_URL` (prod backend URL), `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`. **Never set** `VITE_USE_MOCK_API` or `VITE_E2E_AUTH_BYPASS` in prod (would silently bypass auth / serve fake data — see B6). Add Firebase **Authorized domains** (Firebase console → Auth → Settings) for the prod web domain or sign-in fails.

### B6. Add a guard so the E2E auth bypass can never activate in a prod build
- **File:** `src/core/auth/AuthContext.tsx:26-40`
- The bypass is correctly env-gated, but a misconfigured env var would silently disable all auth. Cheap insurance.
- **Action:** Throw/disable if bypass is on outside DEV, e.g. `if (E2E_AUTH_BYPASS && import.meta.env.PROD) throw new Error('E2E bypass enabled in production build')`. Same idea optionally for `VITE_USE_MOCK_API`.

### B7. Legal: Privacy Policy + Terms of Service (full treatment)
- **Files to add:** `src/features/legal/pages/PrivacyPolicyPage.tsx`, `src/features/legal/pages/TermsOfServicePage.tsx`; routes in `src/App.tsx` (public, **outside** `ProtectedRoute`, e.g. `/privacy`, `/terms`); links from `SignInPage` and `SettingsPage` ("Data & privacy" section already exists at `src/features/settings/pages/SettingsPage.tsx:211`).
- The app is login-gated, but landlords enter **tenants' personal data** → you are a data controller/processor and need a lawful basis + disclosure. A privacy policy is also required by Firebase/Google and app-store-adjacent policies, and to legitimately collect PII.
- **Action / content checklist (bilingual he/en):**
  - **Privacy Policy:** what data is collected (account email via Firebase, tenant PII, financial/lease records, uploaded documents); purposes; legal basis; processors/sub-processors (Firebase/Google, Railway, the DB host); data location/retention; user rights (access, rectification, deletion, portability); how to exercise them; the existing **account deletion** path (`DELETE /users/me`, wired in Settings) as the deletion mechanism; cookies/local storage usage (language/theme/auth token); contact email of the data controller.
  - **Terms of Service:** acceptable use, that the landlord is responsible for having a lawful basis to store their tenants' data, disclaimer/limitation of liability, governing law/jurisdiction.
  - Get the wording reviewed by someone qualified for your jurisdiction (Israel/EU GDPR if any EU tenants). Treat the generated text as a starting draft, not legal advice.
- **Cookie/consent banner (the "cookies message" almost every site shows):** That banner is a GDPR/ePrivacy **consent** requirement for **non-essential** cookies (analytics, tracking, marketing). This app currently uses only **strictly-necessary first-party storage** — Firebase auth token, language, theme in `localStorage` — which is **exempt from consent**. So a full consent banner is **not legally required right now**; a short cookie/storage disclosure inside the Privacy Policy (B7) is sufficient.
  - **Trigger:** the moment you add anything that tracks users — analytics (GA/Plausible) or arguably Sentry session replay (S1) — a consent banner with opt-in **becomes required**. Wire Sentry so it does **not** load until consent if you go that route, or keep Sentry to error-only (no replay/PII) to stay in the "functional" bucket. Plan the banner as a fast-follow tied to whenever tracking is introduced.

### B8. Accessibility compliance (legal requirement in Israel)
- **Why a blocker:** This is a Hebrew/ILS public-facing service. Under Israeli law — *Equal Rights for Persons with Disabilities (Service Accessibility) Regulations* — a public web service must conform to **IS 5568**, which is based on **WCAG 2.0 Level AA**, and must publish an **accessibility statement** (הצהרת נגישות). Non-compliance carries real legal/financial exposure. (If you also serve EU users, WCAG 2.1 AA / EAA applies similarly.)
- **Files:** new `src/features/legal/pages/AccessibilityStatementPage.tsx` + public route in `src/App.tsx` (e.g. `/accessibility`), linked from sign-in/settings footer alongside privacy/terms; accessibility fixes are spread across `src/shared/components/**` and feature pages.
- **Action:**
  1. **Accessibility statement page (הצהרת נגישות):** required content — the conformance level aimed for (IS 5568 / WCAG 2.0 AA), known limitations, date last reviewed, and a **named accessibility coordinator with contact details** (the regulations require a contact route for accessibility issues).
  2. **WCAG 2.0 AA conformance audit & fixes — this is the actual legal obligation:** keyboard navigation for all interactive elements (drawers, dialogs, command palette, custom Radix selects, wheel/date pickers); visible focus indicators; correct focus trapping/restore in `Drawer.tsx` and Radix dialogs; ARIA labels on icon-only buttons; form inputs all associated with labels (largely OK per audit); color-contrast check against the theme tokens (`src/core/theme/colors.ts`, `cssVars.ts`) for AA (4.5:1 text); `alt` text on meaningful images; correct heading order; `aria-live` for toasts (`Toast.tsx`) and async/loading states; respect `prefers-reduced-motion` for the spinners/animations; ensure RTL is fully correct. Run automated checks (axe DevTools / Lighthouse) **and** a manual keyboard + screen-reader (NVDA/VoiceOver) pass — automation catches only ~part of the issues.
  3. **Accessibility widget (optional, common in IL):** a toolbar like EqualWeb / Nagich (נגיש בקליק) / UserWay gives the visible "accessibility button" users expect and provides font-size/contrast controls. **Important:** a widget is a convenience layer and is **not a substitute** for the WCAG AA conformance in step 2 — courts/regulators look at actual conformance. Treat it as optional polish on top of real fixes, or skip if you implement native controls.

---

## SHOULD-FIX — strongly recommended before going live

### S1. Production error monitoring (Sentry)
- **Files:** `src/main.tsx` (init), `vite.config.ts` (optional sourcemap upload), new `VITE_SENTRY_DSN` env.
- Today prod errors are invisible (console logs are DEV-gated).
- **Action:** Add `@sentry/react`, init only when `import.meta.env.PROD`, wrap the router/app, capture unhandled errors + the route error boundary. Keep `tracesSampleRate` low. Upload sourcemaps to Sentry as a build step but do **not** ship `.map` files publicly (see S6).

### S2. Non-DEV-gated `console.error` in form drawers
- **Files:** `src/features/properties/pages/PropertyFormDrawer.tsx:144`, `src/features/renters/pages/RenterFormDrawer.tsx:127`, `src/features/suppliers/pages/SupplierFormDrawer.tsx:85`.
- These log raw errors to the prod console. Gate behind `if (import.meta.env.DEV)` or route through Sentry (S1).

### S3. Non-functional "Export data" button
- **File:** `src/features/settings/pages/SettingsPage.tsx:218-227` — the button has no `onClick`.
- **Action:** Either implement export (CSV/JSON of the user's data — also nicely supports the GDPR "portability" claim in B7) or hide the row until implemented. Don't ship a dead button.

### S4. File-upload hardening (client side)
- **File:** `src/shared/utils/firebaseUpload.ts`, `src/shared/components/form/FormFileInput.tsx`, `FormDocumentInput.tsx`.
- `accept="..."` is only a hint. Add real validation before `uploadBytes`: enforce max size and an allowed MIME/extension list; pass explicit content type: `uploadBytes(ref, file, { contentType: file.type || 'application/octet-stream' })`. This complements (does not replace) the Storage rules in B3.

### S5. PWA manifest icons are invalid (non-square)
- **File:** `public/manifest.json` — icons are `1049x754`, `1169x874`, `1024x1024`. Install/maskable icons must be **square** `192x192` and `512x512`.
- **Action:** Generate square 192 & 512 PNGs (plus a maskable variant), update manifest. Add iOS support in `index.html`: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`. Without this, "Add to Home Screen" is broken.

### S6. Vite build hardening / optimization
- **File:** `vite.config.ts` (currently minimal: no `build` block).
- **Action:** Explicitly set `build.sourcemap: false` (or `'hidden'` if uploading to Sentry) so source isn't publicly served. Consider `manualChunks` to split vendor bundles (firebase, recharts, radix) — the main bundle is large and recharts alone is sizable. Confirm `npm run build` (`tsc -b && vite build`) passes cleanly in CI before deploy.

### S7. TypeScript strict mode is OFF
- **File:** `tsconfig.app.json` — has `noUnusedLocals`/`noUnusedParameters` but **not** `"strict": true` (so `strictNullChecks`, `noImplicitAny`, etc. are off).
- **Action:** Turn on `"strict": true` and fix the fallout before deploy, or at least record the decision. Strict null checks would catch a class of runtime crashes in a data-entry app. This may surface a meaningful number of errors — scope accordingly.

### S8. Confirm CORS preflight + auth header end-to-end against prod backend
- After B1, verify the browser can do `OPTIONS` preflight and send `Authorization: Bearer <firebase token>` to the Railway backend. The 401 interceptor (`src/core/api/client.ts:51-57`) auto-signs-out — make sure a CORS failure isn't being misread as a 401.

---

## NICE-TO-HAVE — polish, can follow shortly after launch

- **N1. Replace default README** (`README.md` is still the Vite template). Document setup, env vars, build, Railway deploy, and the mock/E2E flags.
- **N2. CI pipeline** (`.github/workflows/`): run `npm run lint`, `npm run build`, and Playwright e2e (`e2e/*.spec.ts`, config `playwright.config.ts`) on PRs / pre-deploy. Tests already exist and run fully offline (mock + bypass) — wire them into CI.
- **N3. SEO is low priority** (app is login-gated). Add a `public/robots.txt` with `Disallow: /` so the private app isn't indexed. Skip sitemap/OG unless a public marketing page is added.
- **N4. App-level React error boundary** in addition to the route-level `RouteErrorPage` (`src/shared/components/ui/RouteErrorPage.tsx`) so a render error in a modal/drawer doesn't blank the whole app.
- **N5. 401 auto-sign-out dedupe** (`src/core/api/client.ts:55`): guard against multiple concurrent 401s each firing `signOut`.
- **N6. Report download timeout** (`src/features/reports/api/reports.ts`): uses a per-request `timeout: 30000` overriding the 10s default — verify large reports actually complete; surface a clear error/spinner on timeout.
- **N7. i18n fallback-string cleanup:** several `t('key', 'English fallback')` calls (e.g. in `SuppliersListPage`, `SupplierFormDrawer`, `SettingsPage`, report pages) mask missing keys. Audit `src/core/i18n/locales/{en,he}.json` for full coverage and drop inline fallbacks.
- **N8. `.well-known/security.txt`** with a security contact (optional, good practice for an app holding PII).

---

## Suggested execution order

1. **Backend:** B1 (CORS env-driven) → redeploy backend on Railway.
2. **Firebase:** B3 (Storage rules), B5 (Authorized domains).
3. **Frontend infra:** B2 (Dockerfile/Caddy + railway.toml), B4 (headers), B5 (Railway env vars), B6 (bypass guard), S6 (build config).
4. **Code fixes:** S2, S3, S4, B6, S1 (Sentry), optionally S7.
5. **Legal:** B7 (privacy + terms pages + routes + links) and B8 (accessibility statement + WCAG AA fixes; optional widget). Plan the cookie consent banner as a fast-follow tied to whenever analytics/tracking is added (see B7 cookie note).
6. **Polish:** S5 (icons), then N-items.

---

## Verification (end-to-end, before flipping DNS / sharing the URL)

1. **Build:** `npm run build` completes with no TS/Vite errors; inspect `dist/` and confirm **no `.map` files** are served publicly (S6).
2. **CORS / API:** From the deployed web origin, sign in with a real Firebase account and load `/home`, `/properties`, `/transactions` — confirm network tab shows successful preflight + authorized calls to the Railway backend (B1, S8). Confirm a forced 401 logs the user out cleanly.
3. **Auth + deep links:** Hard-refresh a deep route (e.g. `/properties/1`) — must load, not 404 (B2). Sign-out and visiting a protected route redirects to `/sign-in`. Confirm prod build does **not** auto-sign-in (B6) and shows real (not mock) data (B5).
4. **File upload:** Upload a property image + a renter/transaction document; confirm it lands under the user's own Storage path and that another user cannot read/overwrite it (B3); confirm oversized/wrong-type files are rejected (S4).
5. **Headers:** `curl -I https://<web-domain>/` and a deep route — verify HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and cache headers (`immutable` on `/assets/*`, no-cache on `index.html`) (B2/B4).
6. **Legal:** `/privacy`, `/terms`, and `/accessibility` load **without** login; links reachable from sign-in and settings (B7, B8).
7. **Accessibility:** Lighthouse/axe score acceptable; full keyboard-only pass through sign-in → add property → add renter → add transaction → reports (no mouse); screen-reader smoke test (NVDA/VoiceOver) reads labels and toasts; contrast passes AA (B8).
8. **Cookies:** confirm no non-essential/tracking cookies are set pre-consent; if Sentry/analytics added, the consent banner gates them (B7).
9. **Monitoring:** Trigger a deliberate error and confirm it appears in Sentry (S1).
10. **PWA:** On Android Chrome and iOS Safari, "Add to Home Screen" shows the correct square icon and name (S5).
11. **Regression:** `npm run test:e2e` passes locally/CI (N2).
