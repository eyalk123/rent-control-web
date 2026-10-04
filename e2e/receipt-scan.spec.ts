import { test, expect, expectToast } from './fixtures';

// A 1x1 PNG. The mock extractReceipt ignores the file and returns a canned read: amount 480
// (flagged low-confidence, read as "48O"), cash, the first single-category active supplier
// (City Power Co) with its category, and — when asked to look — the first property.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function openExpenseForm(page: import('@playwright/test').Page) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  await page.getByRole('button', { name: 'Expense', exact: true }).click();
}

async function scanReceipt(page: import('@playwright/test').Page) {
  await page.locator('input[type="file"][accept^="image/*,application/pdf"]').setInputFiles({
    name: 'receipt.png',
    mimeType: 'image/png',
    buffer: PNG_1x1,
  });
  await expectToast(page, 'Receipt read — check the highlighted fields before saving');
}

test.describe('receipt scanner', () => {
  test('a scanned receipt pre-fills the expense form, flags what to check, and saves', async ({ page }) => {
    await openExpenseForm(page);
    // A paid plan has no allowance to count down, so no quota line.
    await expect(page.getByRole('button', { name: 'Scan & fill' })).toBeVisible();
    await expect(page.getByText('scans left this month', { exact: false })).toHaveCount(0);

    await scanReceipt(page);

    // The scanned image is now the receipt; the card says the form came from it.
    await expect(page.getByText('receipt.png')).toBeVisible();
    await expect(page.getByText('Filled from receipt')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replace' })).toBeVisible();

    await expect(page.getByRole('spinbutton', { name: 'Amount' })).toHaveValue('480');
    await expect(page.getByRole('combobox').filter({ hasText: 'City Power Co' })).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'Cash' })).toBeVisible();
    // No property was chosen, so the scan was asked to find one.
    await expect(page.getByText('123 Main St', { exact: false }).first()).toBeVisible();
    // The uncertain amount carries the text it was read from.
    await expect(page.getByText('Double-check this auto-filled value')).toBeVisible();
    await expect(page.getByText('Found in: "48O"')).toBeVisible();

    // Correcting the flagged value clears its flag.
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('450');
    await expect(page.getByText('Double-check this auto-filled value')).toHaveCount(0);

    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, '1 transactions saved');
  });

  test('a receipt can be attached without scanning, and removed', async ({ page }) => {
    await openExpenseForm(page);
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'paper.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });
    await expect(page.getByText('paper.png')).toBeVisible();
    await expect(page.getByText('Filled from receipt')).toHaveCount(0);
    await expect(page.getByRole('spinbutton', { name: 'Amount' })).toHaveValue('');

    await page.getByRole('button', { name: 'Remove receipt' }).click();
    await expect(page.getByRole('button', { name: 'Scan & fill' })).toBeVisible();
  });

  test.describe('on the free plan', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('mock.plan', 'free');
        } catch {
          /* ignore */
        }
      });
    });

    test('the monthly allowance is shown up front and counts down', async ({ page }) => {
      await openExpenseForm(page);
      await expect(page.getByText('3 AI receipt scans left this month')).toBeVisible();

      await scanReceipt(page);
      // The quota is on the empty card; removing the receipt brings it back, one down.
      await page.getByRole('button', { name: 'Remove receipt' }).click();
      await expect(page.getByText('2 AI receipt scans left this month')).toBeVisible();
    });
  });
});
