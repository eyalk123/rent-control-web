import { test, expect, expectToast } from './fixtures';

test.describe('suppliers', () => {
  test('list shows seeded suppliers', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
    await expect(page.getByText('Joe Plumber')).toBeVisible();
    await expect(page.getByText('City Power Co')).toBeVisible();
  });

  test('name filter narrows the list', async ({ page }) => {
    await page.goto('/suppliers');
    // Filtering is via the "Name" dropdown (the first of the two filter selects).
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Joe Plumber' }).click();
    await expect(page.getByRole('button', { name: /Joe Plumber/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /City Power Co/ })).toHaveCount(0);
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/suppliers');
    await page.getByRole('button', { name: 'Add Supplier' }).click();
    await expect(page.getByRole('heading', { name: 'Add Supplier' })).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    // Name + at least one category are required; errors render inline on the single-page form.
    await expect(page.getByText(/required/i).first()).toBeVisible();
    await expect(page.getByText('Supplier created')).toHaveCount(0);
  });

  test('can create a supplier (round-trip)', async ({ page }) => {
    await page.goto('/suppliers');
    await page.getByRole('button', { name: 'Add Supplier' }).click();

    await page.getByLabel('Name').fill('E2E Handyman');
    // At least one category chip is required (exact: the chip, not a card pill).
    await page.getByRole('button', { name: 'Maintenance', exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Supplier created');
    await expect(page.getByText('E2E Handyman')).toBeVisible();
  });

  test('can edit and deactivate a supplier (round-trip)', async ({ page }) => {
    await page.goto('/suppliers');
    // Cards are buttons; open the seeded "Water Utility" — this shows the detail drawer.
    await page.getByRole('button', { name: /Water Utility/ }).click();
    // The detail drawer is titled with the supplier name; its "Edit" button opens the form.
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Supplier' })).toBeVisible();

    // Edit the name, save.
    await page.getByLabel('Name').fill('Water Utility Co');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Supplier updated');
    await expect(page.getByText('Water Utility Co')).toBeVisible();

    // Re-open the detail drawer and deactivate (in-app ConfirmDialog, not window.confirm).
    await page.getByRole('button', { name: /Water Utility Co/ }).click();
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await page
      .getByRole('dialog')
      .filter({ hasText: 'Deactivate this supplier?' })
      .getByRole('button', { name: 'Deactivate' })
      .click();
    await expectToast(page, 'Supplier deactivated');
    // Deactivated suppliers drop out of the default (active-only) list.
    await expect(page.getByText('Water Utility Co')).toHaveCount(0);
  });
});
