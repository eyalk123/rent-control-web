import { test, expect, expectToast } from './fixtures';

// Supplier and category are independent on the expense form: every supplier is offered,
// the ones in a chosen category first, and a supplier outside the chosen categories is a
// warning on save rather than something the form prevents.
// Mock suppliers: Joe Plumber (maintenance, repairs), City Power Co (electricity), Water
// Utility (water).

async function openExpenseFromProperty(page: import('@playwright/test').Page) {
  await page.goto('/properties/1');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  await page.getByRole('button', { name: 'Expense', exact: true }).click();
}

test.describe('expense supplier', () => {
  test('every supplier is offered, the chosen category\'s first', async ({ page }) => {
    await openExpenseFromProperty(page);
    await page.getByRole('button', { name: 'Water', exact: true }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select supplier' }).click();

    const options = page.getByRole('option');
    await expect(options).toHaveText(['Water Utility', 'City Power Co', 'Joe Plumber']);
    await expect(page.getByText('Other suppliers')).toBeVisible();
  });

  test('a supplier outside the chosen category warns before saving, and can be saved anyway', async ({ page }) => {
    await openExpenseFromProperty(page);
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('300');
    await page.getByRole('button', { name: 'Water', exact: true }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select supplier' }).click();
    await page.getByRole('option', { name: 'Joe Plumber' }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select payment method' }).click();
    await page.getByRole('option', { name: 'Cash' }).click();

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText("Joe Plumber isn't listed under Water. Save anyway?")).toBeVisible();

    // Going back keeps the form as it was.
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.getByRole('combobox').filter({ hasText: 'Joe Plumber' })).toBeVisible();

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save anyway' }).click();
    await expectToast(page, '1 transactions saved');
  });

  test('a matching supplier saves without a warning', async ({ page }) => {
    await openExpenseFromProperty(page);
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('300');
    await page.getByRole('button', { name: 'Repairs', exact: true }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select supplier' }).click();
    await page.getByRole('option', { name: 'Joe Plumber' }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select payment method' }).click();
    await page.getByRole('option', { name: 'Cash' }).click();

    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, '1 transactions saved');
  });
});
