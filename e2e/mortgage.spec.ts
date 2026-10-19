import { test, expect, expectToast } from './fixtures';

// Layer 2: the bank's yearly statement, typed into the property's mortgage section.
test.describe('mortgage yearly summary', () => {
  test('a year from the bank is added, shown, and gives the equity', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Add property' }).click();
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();
    await page.getByLabel('Address').fill('7 Mortgage Lane');
    await page.getByLabel('City').fill('Haifa');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'House', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel(/Purchase price/).fill('2000000');
    await page.getByRole('switch', { name: 'This property has a mortgage' }).click();
    await page.getByLabel(/Monthly payment/).fill('5358');
    await page.getByLabel('Charge day').fill('10');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Property created');
    await page.getByRole('button', { name: 'Maybe later' }).click();

    await page.getByText('7 Mortgage Lane').first().click();
    await expect(page.getByText('Yearly from the bank')).toBeVisible();
    await page.getByRole('button', { name: 'Add a year' }).click();
    const last = String(new Date().getFullYear() - 1);
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue(last);
    await page.getByLabel(/Interest paid/).fill('41049');
    await page.getByLabel(/Linkage differences/).fill('8235');
    await page.getByLabel(/Balance on December 31/).fill('984720');
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, `${last} saved`);
    await expect(page.getByText(/Interest 41,049/)).toBeVisible();
    await expect(page.getByText(/1,015,280/)).toBeVisible();
  });
});
