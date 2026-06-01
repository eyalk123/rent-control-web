import { test, expect } from './fixtures';

test.describe('settings', () => {
  test('renders the settings sections', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible();
  });

  test('switching language to Hebrew flips the layout to RTL', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    // The Hebrew option label is the literal "עברית" regardless of current locale.
    await page.getByRole('button', { name: 'עברית' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('account section shows the signed-in (bypass) user', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('main').getByText('e2e@test.local')).toBeVisible();
  });
});
