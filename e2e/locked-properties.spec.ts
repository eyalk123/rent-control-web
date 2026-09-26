import { test, expect } from './fixtures';

// The mock account on the free plan: two properties covered, the three newest locked.
// A locked property is inaccessible — a stub in the list, a locked screen on its detail,
// and absent from pickers — rather than read-only.

test.describe('locked properties', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('mock.plan', 'free');
      } catch {
        /* ignore */
      }
    });
  });

  test('the list shows locked properties as stubs with Upgrade and Delete', async ({ page }) => {
    await page.goto('/properties');

    const stubs = page.getByTestId('locked-property-card');
    await expect(stubs).toHaveCount(3);
    await expect(stubs.first().getByRole('button', { name: 'Upgrade' })).toBeVisible();
    await expect(stubs.first().getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(stubs.first().getByText('Locked')).toBeVisible();
  });

  test('Upgrade on a stub goes to the plans page', async ({ page }) => {
    await page.goto('/properties');
    await page.getByTestId('locked-property-card').first().getByRole('button', { name: 'Upgrade' }).click();
    await expect(page).toHaveURL(/\/plans$/);
  });

  test('opening a locked property shows the locked screen, not its details', async ({ page }) => {
    await page.goto('/properties/5');

    await expect(page.getByTestId('locked-property-state')).toBeVisible();
    await expect(page.getByText('This property is locked')).toBeVisible();
  });

  test('deleting a stub removes it from the list', async ({ page }) => {
    await page.goto('/properties');
    const stubs = page.getByTestId('locked-property-card');
    await expect(stubs).toHaveCount(3);

    await stubs.first().getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();

    // One fewer property: the plan now covers two of four, so two stubs remain.
    await expect(stubs).toHaveCount(2);
  });
});
