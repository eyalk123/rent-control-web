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
    await page.goto('/transactions/1');
    await page.getByRole('button', { name: 'Delete' }).click(); // opens the confirm dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
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

  // Opening the form from a renter carries that renter's property, the renter itself, and
  // their payment method into it. Renter #1 (Sarah Johnson) lives at property #1, which also
  // houses Michael Chen — only the renter we came from may be checked.
  test('record-payment from a renter prefills property, renter and payment method', async ({ page }) => {
    await page.goto('/renters/1');
    await page.getByRole('button', { name: 'Record payment' }).click();

    await expect(page.getByText('123 Main St', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Sarah Johnson' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Michael Chen' })).not.toBeChecked();

    // Regression: renter payment_type is 'wire_transfer', a legacy alias outside the
    // transaction PaymentMethod domain. Seeding it raw left the select holding a value with
    // no matching option, so the trigger rendered blank and the API rejected it on save.
    await expect(page.getByRole('combobox').filter({ hasText: 'Bank transfer' })).toBeVisible();
  });

  // Opened from a property, the renter is only unambiguous when the property has exactly one.
  test('add-transaction from a property prefills the property, and the renter only if single', async ({ page }) => {
    // Property #1 has two renters — neither may be pre-checked.
    await page.goto('/properties/1');
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    await page.getByRole('button', { name: 'Revenue', exact: true }).click();
    await expect(page.getByText('123 Main St', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Sarah Johnson' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Michael Chen' })).not.toBeChecked();

    // Property #2 has only Emily Davis, so she is unambiguous and gets checked.
    await page.goto('/properties/2');
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    await page.getByRole('button', { name: 'Revenue', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Emily Davis' })).toBeChecked();
  });

  // A form that only holds seeded values has no user changes to discard, so closing it must
  // not stop to ask. The prefill and the today-defaulted date both used to trip that guard.
  test('closing an untouched prefilled form does not prompt to discard', async ({ page }) => {
    await page.goto('/renters/1');
    await page.getByRole('button', { name: 'Record payment' }).click();
    await expect(page.getByRole('checkbox', { name: 'Sarah Johnson' })).toBeChecked();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add transaction', level: 2 })).toHaveCount(0);
    await expect(page.getByText('Discard changes')).toHaveCount(0);
  });
});
