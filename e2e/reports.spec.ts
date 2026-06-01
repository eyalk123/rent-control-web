import { test, expect } from './fixtures';

test.describe('reports', () => {
  test('hub lists both report types', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await expect(page.getByText('Income & Expense')).toBeVisible();
    await expect(page.getByText('Expense Log')).toBeVisible();
  });

  test('opens the income & expense report', async ({ page }) => {
    await page.goto('/reports');
    await page.getByRole('button', { name: 'Open report' }).first().click();
    await expect(page).toHaveURL(/\/reports\/income-expense$/);
    // Computed 6-month summary drives this page.
    await expect(page.getByRole('main').getByText(/Revenue|Expense/i).first()).toBeVisible();
  });

  test('opens the expense log report', async ({ page }) => {
    await page.goto('/reports/expense-log');
    await expect(page.getByRole('main').getByText(/Expense/i).first()).toBeVisible();
    // Seeded expenses surface their supplier/category.
    await expect(page.getByText(/Joe Plumber|Maintenance|Electricity/i).first()).toBeVisible();
  });
});
