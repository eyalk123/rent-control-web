import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared E2E fixtures.
 *
 * - Pins the app language to English (the UI is i18n EN/HE; selectors below
 *   assume the English strings) before any app script runs.
 * - Collects uncaught page errors so specs can assert a flow produced no crash.
 *
 * The app itself is booted by Playwright's webServer in `vite --mode test`, which
 * loads .env.test → VITE_USE_MOCK_API=true + VITE_E2E_AUTH_BYPASS=true. So every
 * test starts already "signed in" against the in-memory mock data, and the seed
 * data resets on each full page load (per-test isolation).
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await use(errors);
  },
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('app_language', 'en');
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
});

export { expect };

/** Wait for a toast with the given (substring) message to appear. */
export async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
}

/** The route-level error boundary heading; asserting its absence = page rendered OK. */
export const ROUTE_ERROR_HEADING = 'Something went wrong';

export async function expectNoRouteError(page: Page) {
  await expect(page.getByText(ROUTE_ERROR_HEADING)).toHaveCount(0);
}

/**
 * Arm the onboarding tours for one spec.
 *
 * They are suppressed for the rest of the suite (see `features/onboarding/api/tourState`)
 * because the first-run tour is a click-blocking overlay on `/home`. Must be called
 * before the first `goto`, since it runs as an init script.
 */
export async function enableTours(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding.e2eTours', 'on');
    } catch {
      /* ignore */
    }
  });
}

/**
 * Wait until a protected route has actually rendered.
 *
 * Replaces `waitForLoadState('networkidle')`, which Playwright itself discourages and
 * which is actively wrong here: routes are lazy-loaded chunks and the dev server holds
 * an open HMR socket, so "no network for 500ms" is not a signal that the page is ready
 * — under parallel load it would hang until the 30s test timeout.
 *
 * These two conditions are the real thing being waited for: the app shell is mounted,
 * and no Suspense/loading spinner is left on screen.
 */
export async function waitForAppReady(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.animate-spin')).toHaveCount(0);
}
