import { test, expect, expectToast } from './fixtures';

test.describe('properties', () => {
  test('list shows seeded properties', async ({ page }) => {
    await page.goto('/properties');
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
    await expect(page.getByText('123 Main St')).toBeVisible();
    await expect(page.getByText('456 Oak Avenue')).toBeVisible();
  });

  test('search filters the list', async ({ page }) => {
    await page.goto('/properties');
    await page.getByPlaceholder(/Search address or city/i).fill('Oak');
    await expect(page.getByText('456 Oak Avenue')).toBeVisible();
    await expect(page.getByText('123 Main St')).toHaveCount(0);
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Add property' }).click();
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    // Step 1 "Next" triggers validation of address/city/type.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('can create a property (round-trip)', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Add property' }).click();

    await page.getByLabel('Address').fill('999 E2E Boulevard');
    await page.getByLabel('City').fill('Testville');
    // Property type is a Radix Select.
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'House' }).click();

    await page.getByRole('button', { name: 'Next' }).click();
    // Regression for H1: Owner is genuinely optional — Save works without choosing one.
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Property created');
    await expect(page.getByText('999 E2E Boulevard')).toBeVisible();
  });
});
