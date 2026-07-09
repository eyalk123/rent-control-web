import { test, expect } from './fixtures';

// A 1x1 PNG. The mock extractLease ignores the file contents and always returns a canned
// joint-rent lease with two renters (Noa Cohen, Amir Katz) and joint_monthly_rent = 6000,
// so any valid image drives the flow to the summary drawer.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Open the scan drawer from the Renters page, upload a file, and land on the summary. */
async function reachSummary(page: import('@playwright/test').Page) {
  await page.goto('/renters');
  await page.getByRole('button', { name: 'Add renter' }).click();
  await page.getByRole('menuitem', { name: 'Scan a lease' }).click();
  await expect(page.getByRole('heading', { name: 'Scan a document' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'lease.png',
    mimeType: 'image/png',
    buffer: PNG_1x1,
  });
  await page.getByRole('button', { name: 'Extract details' }).click();

  // The mock extraction has a ~2.5s delay before the summary auto-opens.
  await expect(page.getByRole('heading', { name: 'Review what we found' })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('lease scanner — remove a found renter', () => {
  test('removing a renter re-splits the joint rent and can be undone', async ({ page }) => {
    await reachSummary(page);

    const noaRow = page.getByRole('listitem').filter({ hasText: 'Noa Cohen' });
    const amirRow = page.getByRole('listitem').filter({ hasText: 'Amir Katz' });

    // Joint 6,000₪ across two renters → 3,000₪ each.
    await expect(noaRow).toContainText('3,000₪');
    await expect(amirRow).toContainText('3,000₪');

    // Remove one renter (mis-extracted).
    await page.getByRole('button', { name: 'Remove Noa Cohen' }).click();

    // It's hidden from the list with an undo affordance…
    await expect(page.getByText('Noa Cohen removed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();

    // …and the whole 6,000₪ is now redistributed to the one remaining renter.
    await expect(amirRow).toContainText('6,000₪');

    // Can't remove the last kept renter — the button is disabled.
    await expect(page.getByRole('button', { name: 'Remove Amir Katz' })).toBeDisabled();

    // Undo restores the renter and re-splits evenly again.
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(noaRow).toContainText('3,000₪');
    await expect(amirRow).toContainText('3,000₪');
  });
});
