import { test, expect, expectToast } from './fixtures';

// A confirmed CPI rent change can be confirmed or edited (usually rounded) straight from the
// alert. The mock feed carries one confirmed sample (Michael Chen) and one estimate.
test.describe('CPI alert: confirm or edit the new rent', () => {
  test('the estimate keeps Ignore; the final figure offers Edit amount and Confirm', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('button', { name: 'Notifications' }).click();
    const panel = page.getByRole('dialog', { name: 'Notifications' });

    await expect(panel.getByText('Estimated amount')).toBeVisible();
    await expect(panel.getByText('Final amount')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Edit amount' })).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'Confirm' })).toHaveCount(1);
  });

  test('an edited amount is saved as the year\'s rent and clears the alert', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('button', { name: 'Notifications' }).click();
    const panel = page.getByRole('dialog', { name: 'Notifications' });
    await panel.getByRole('button', { name: 'Edit amount' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Agreed rent' });
    await dialog.getByRole('button', { name: /5,250/ }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'New rent saved');
    await expect(panel.getByRole('button', { name: 'Edit amount' })).toHaveCount(0);

    // In-app navigation: the mock data lives in memory, so a reload would forget the save.
    await panel.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('link', { name: 'Renters' }).first().click();
    await page.getByText('Michael Chen').first().click();
    await expect(page.getByText('Set by you')).toBeVisible();
  });
});
