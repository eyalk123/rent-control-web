import { test, expect } from './fixtures';

test.describe('home dashboard', () => {
  test('renders greeting and dashboard sections', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible();
    await expect(page.getByText('Cash Flow')).toBeVisible();
    await expect(page.getByText('Needs Attention')).toBeVisible();
    await expect(page.getByText('Recent Transactions')).toBeVisible();
  });

  test('shows recent transactions from seed data', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByText('Sarah Johnson').first()).toBeVisible();
  });

  test('portfolio occupancy reflects seeded properties', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByText(/Portfolio occupancy/i)).toBeVisible();
  });
});
