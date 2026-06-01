import { test, expect, expectToast } from './fixtures';

test.describe('transactions', () => {
  test('list shows seeded transactions and KPIs', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    // Revenue rows show the renter; expense rows show the supplier.
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Joe Plumber')).toBeVisible();
    // KPI tiles render off the computed 6-month summary.
    await expect(page.getByText('This month revenue', { exact: false })).toBeVisible();
  });

  test('type filter narrows revenue vs expense', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Expenses', exact: true }).click();
    await expect(page.getByText('Joe Plumber')).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toHaveCount(0);

    await page.getByRole('button', { name: 'Revenues', exact: true }).click();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Joe Plumber')).toHaveCount(0);
  });

  test('search filters the list', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByPlaceholder(/Search by party or notes/i).fill('Emily');
    await expect(page.getByText('Emily Davis')).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toHaveCount(0);
  });

  test('detail page renders a transaction', async ({ page }) => {
    await page.goto('/transactions/1');
    await expect(page.getByText('Details', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Sarah Johnson').first()).toBeVisible();
  });

  test('can delete a transaction (round-trip)', async ({ page }) => {
    page.on('dialog', (d) => d.accept()); // confirm() on delete
    await page.goto('/transactions/1');
    await page.getByRole('button', { name: 'Delete' }).click();
    await expectToast(page, 'Transaction deleted');
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test('add-transaction drawer opens with a Revenue/Expense type chooser', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add transaction', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revenue', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expense', exact: true })).toBeVisible();
  });
});
