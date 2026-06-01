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
