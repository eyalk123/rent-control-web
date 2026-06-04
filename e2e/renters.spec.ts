import { test, expect, expectToast } from './fixtures';

test.describe('renters', () => {
  test('list shows seeded renters', async ({ page }) => {
    await page.goto('/renters');
    await expect(page.getByRole('heading', { name: 'Renters' })).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Michael Chen')).toBeVisible();
  });

  test('search filters the list', async ({ page }) => {
    await page.goto('/renters');
    await page.getByPlaceholder(/Search renters/i).fill('Sarah');
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Michael Chen')).toHaveCount(0);
  });

  // Regression for M1: step-1 required fields are validated on "Next", so the errors
  // show immediately on step 1 instead of being hidden behind step 2.
  test('Next validates step-1 required fields inline (M1)', async ({ page }) => {
    await page.goto('/renters');
    await page.getByRole('button', { name: 'Add renter' }).click();
    await expect(page.getByRole('heading', { name: 'Add Renter' })).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();

    // Stayed on step 1 (First Name still visible, no step-2 Save), with required errors shown.
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(page.getByText(/required/i).first()).toBeVisible();
    await expect(page.getByText('Renter created')).toHaveCount(0);
  });

  // Regression: opening the edit drawer for a renter with a connected property must show
  // that property pre-selected. A Radix Select fires a spurious onValueChange('') for one
  // render as the reset()-seeded value transitions, which used to wipe the selection and
  // leave the field empty. Renter #6 (Robert Thompson) is linked to property #4.
  test('edit drawer pre-fills the connected property', async ({ page }) => {
    await page.goto('/renters/6');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(
      page.getByRole('combobox').filter({ hasText: '321 Pine Road' })
    ).toBeVisible();
  });

  // Regression: the payment-type select must use the renter domain (cash|wire_transfer|bit),
  // not the transaction method domain. Renter #1 (Sarah Johnson) has payment_type
  // 'wire_transfer', which renders as "Bank transfer".
  test('edit drawer pre-fills the payment type', async ({ page }) => {
    await page.goto('/renters/1');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByRole('combobox').filter({ hasText: 'Bank transfer' })
    ).toBeVisible();
  });

  // Regression: extra contacts must round-trip (they were being stripped before the
  // PATCH/POST by the renter payload sanitizer).
  test('saves and shows an extra contact', async ({ page }) => {
    await page.goto('/renters/3');
    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.getByPlaceholder('Name').fill('Dana Cohen');
    await page.getByPlaceholder('Phone').fill('050-1234567');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Renter updated');
    await expect(page.getByText('Dana Cohen')).toBeVisible();
  });

  // Regression for H2: name + phone is enough to create a renter (optional Controller
  // fields no longer block submission, and the payment-day wheel is truly optional).
  test('can create a renter (round-trip)', async ({ page }) => {
    await page.goto('/renters');
    await page.getByRole('button', { name: 'Add renter' }).click();

    await page.getByLabel('First Name').fill('Tessa');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Phone').fill('512-555-9999');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Renter created');
    await expect(page.getByText('Tessa Tester')).toBeVisible();
  });
});
