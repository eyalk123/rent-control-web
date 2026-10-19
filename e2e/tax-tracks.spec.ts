import { test, expect } from './fixtures';

// The mock stands in for the server's calculation (`mockTaxTracksApi`), so these check the
// page's shape and the group flow, not the tax arithmetic — that is tested on the backend.
test.describe('tax tracks report', () => {
  test('the hub offers it to an Israeli account', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Tax tracks', { exact: true })).toBeVisible();
  });

  test('shows both tracks per owner, with the disclaimer', async ({ page }) => {
    await page.goto('/reports/tax-tracks');
    await expect(page.getByRole('heading', { name: 'Tax tracks' })).toBeVisible();
    await expect(page.getByText('An estimate for a talk with your accountant, not tax advice.')).toBeVisible();
    await page.getByRole('button', { name: String(new Date().getFullYear()) }).click();
    await expect(page.getByRole('heading', { name: 'Jane Cooper' })).toBeVisible();
    await expect(page.getByText('Exemption', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('10% track', { exact: true }).first()).toBeVisible();
  });

  test('other income completes the marginal track', async ({ page }) => {
    await page.goto('/reports/tax-tracks');
    const year = String(new Date().getFullYear());
    await page.getByRole('button', { name: year }).click();
    const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Jane Cooper' }) });
    await expect(card.getByText('Your other income for ' + year + ', above').first()).toBeVisible();

    await card.getByRole('spinbutton', { name: `Other income in ${year}`, exact: false }).fill('200000');
    await card.getByRole('button', { name: 'Save' }).click();
    await expect(card.getByText('Income tax').first()).toBeVisible();
    await expect(card.getByText('Your other income for ' + year + ', above')).toHaveCount(0);
  });

  test('combining an owner into a group replaces their own card', async ({ page }) => {
    await page.goto('/reports/tax-tracks');
    await page.getByRole('button', { name: 'New group' }).click();
    await page.getByLabel('Group name').fill('Household');
    await page.getByRole('checkbox', { name: 'Jane Cooper' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Household' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jane Cooper' })).toHaveCount(0);
  });
});
