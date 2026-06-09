import { test, expect, expectNoRouteError } from './fixtures';

/**
 * Detail pages must show a graceful "not found" state (not a blank page) for
 * nonexistent IDs and malformed params — and must not bounce the user to
 * /sign-in (which would mean the backend/mock returned 401 instead of 404).
 */
test.describe('detail not-found', () => {
  const cases = [
    { path: '/properties/999999', title: 'Property not found' },
    { path: '/properties/abc', title: 'Property not found' },
    { path: '/renters/999999', title: 'Renter not found' },
    { path: '/transactions/999999', title: 'Transaction not found' },
  ];

  for (const c of cases) {
    test(`${c.path} shows the not-found page`, async ({ page, pageErrors }) => {
      await page.goto(c.path);
      await expect(page).not.toHaveURL(/\/sign-in/);
      await expectNoRouteError(page);
      await expect(page.getByText(c.title).first()).toBeVisible({ timeout: 10_000 });
      expect(pageErrors, `uncaught errors on ${c.path}:\n${pageErrors.join('\n')}`).toEqual([]);
    });
  }

  test('the Go home button returns to /home', async ({ page }) => {
    await page.goto('/properties/999999');
    await page.getByRole('button', { name: 'Go home' }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});
