import { test, expect, expectNoRouteError } from './fixtures';

/**
 * Smoke: every route must load while "signed in" (auth bypass), render its main
 * content, and NOT throw an uncaught error or hit the route error boundary.
 * Detail routes use seed ids that exist in the mock data (property 1, renter 1, transaction 1).
 *
 * Content assertions are scoped to <main> so the always-visible sidebar labels
 * (Properties, Renters, …) don't create false matches.
 */
const ROUTES: { path: string; expect: RegExp | string }[] = [
  { path: '/home', expect: /Good (morning|afternoon|evening)|Portfolio|Needs Attention|Cash Flow/i },
  { path: '/properties', expect: 'Properties' },
  { path: '/properties/1', expect: /123 Main St|Details|Info/i },
  { path: '/renters', expect: 'Renters' },
  { path: '/renters/1', expect: /Sarah|Lease|Info/i },
  { path: '/transactions', expect: 'Transactions' },
  { path: '/transactions/1', expect: /Details|Revenue|Rent/i },
  { path: '/suppliers', expect: 'Suppliers' },
  { path: '/reports', expect: 'Reports' },
  { path: '/reports/income-expense', expect: /Income|Expense|Revenue/i },
  { path: '/reports/expense-log', expect: /Expense|Date|Category/i },
  { path: '/settings', expect: 'Settings' },
];

test.describe('smoke — all routes load without crashing', () => {
  test('root redirects to /home (auth bypass keeps us signed in)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/home$/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  for (const route of ROUTES) {
    test(`loads ${route.path}`, async ({ page, pageErrors }) => {
      await page.goto(route.path);
      // Stayed on the route (not bounced to /sign-in by ProtectedRoute).
      await expect(page).not.toHaveURL(/\/sign-in/);
      await expectNoRouteError(page);
      await expect(page.getByRole('main').getByText(route.expect).first()).toBeVisible({ timeout: 10_000 });
      expect(pageErrors, `uncaught errors on ${route.path}:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('smoke — sidebar navigation', () => {
  test('can navigate between sections via the labelled sidebar', async ({ page }) => {
    await page.goto('/home');
    const sidebar = page.locator('aside').last();
    for (const [href, urlRe] of [
      ['/properties', /\/properties$/],
      ['/renters', /\/renters$/],
      ['/transactions', /\/transactions$/],
      ['/reports', /\/reports$/],
      ['/suppliers', /\/suppliers$/],
    ] as const) {
      await sidebar.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(urlRe);
    }
  });
});
