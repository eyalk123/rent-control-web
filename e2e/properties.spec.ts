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
    // "Add property" opens a chooser (Enter manually / Scan a lease) — pick manual entry.
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    // Step 1 "Next" triggers validation of address/city/type.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('can create a property (round-trip)', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Add property' }).click();
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();

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

  // The Documents tab used to render a drop target whose <input type="file"> had no onChange
  // handler at all — a file went nowhere, silently. This asserts the round trip.
  test('documents tab uploads into a slot and lists it', async ({ page }) => {
    await page.goto('/properties/1?tab=documents');
    // Generous: the detail page is a lazy chunk and fetches before the tab renders.
    await expect(page.getByText('No documents uploaded yet.')).toBeVisible({ timeout: 10_000 });

    // Two slots, in order: Basic Contract, then Land Registry.
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'lease-2026.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 e2e'),
    });

    // The slot now shows the uploaded file, and it has reached the documents list beside it.
    await expect(page.getByRole('link', { name: 'lease-2026.pdf' })).toBeVisible();
    await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
    await expect(page.getByText('No documents uploaded yet.')).toHaveCount(0);

    // Removing clears the slot (sends null, not undefined) and the list empties again.
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByText('No documents uploaded yet.')).toBeVisible();
  });

  test('documents tab accepts a dragged-and-dropped file', async ({ page }) => {
    await page.goto('/properties/1?tab=documents');
    await expect(page.getByText('No documents uploaded yet.')).toBeVisible({ timeout: 10_000 });

    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['%PDF-1.4 e2e'], 'tabu.pdf', { type: 'application/pdf' }));
      return dt;
    });
    // Drop on the second slot (Land Registry). The drop handler sits on the wrapper two levels
    // above the file input: input → FormDocumentInput root → PropertyDocumentSlot wrapper.
    await page.locator('input[type="file"]').nth(1).locator('..').locator('..')
      .dispatchEvent('drop', { dataTransfer });

    await expect(page.getByRole('link', { name: 'tabu.pdf' })).toBeVisible();
  });

  test('documents tab rejects a file over the size limit', async ({ page }) => {
    await page.goto('/properties/1?tab=documents');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'huge.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(11 * 1024 * 1024),
    });

    await expect(page.getByText(/too large/i)).toBeVisible();
    await expect(page.getByText('No documents uploaded yet.')).toBeVisible();
  });
});
