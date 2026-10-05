import { test, expect, expectToast } from './fixtures';

// Property owners are contact records with their own page under Manage, picked on the property
// form. Mock data: one owner, Jane Cooper, who owns 123 Main St.

test.describe('property owners', () => {
  test('the Property owners page lists owners with their property count', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('link', { name: 'Property owners' }).first().click();
    await expect(page).toHaveURL(/\/property-owners$/);

    await page.getByRole('button', { name: /Jane Cooper/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Jane Cooper' });
    await expect(drawer.getByText('1 property', { exact: true })).toBeVisible();
    // Still has a property, so delete is not offered — the reason is.
    await expect(drawer.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(drawer.getByText("An owner with properties can’t be deleted", { exact: false })).toBeVisible();
  });

  test('adds an owner, refuses a duplicate name, and deletes an owner with no properties', async ({ page }) => {
    await page.goto('/property-owners');

    await page.getByRole('button', { name: 'Add owner' }).click();
    await page.getByLabel('Name').fill('Dana Levi');
    await page.getByLabel('Phone').fill('050-1234567');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Owner created');
    await expect(page.getByRole('button', { name: /Dana Levi/ })).toBeVisible();

    await page.getByRole('button', { name: 'Add owner' }).click();
    await page.getByLabel('Name').fill('Dana Levi');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('An owner with this name already exists')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Discard' }).click();

    await page.getByRole('button', { name: /Dana Levi/ }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await expectToast(page, 'Owner deleted');
    await expect(page.getByRole('button', { name: /Dana Levi/ })).toHaveCount(0);
  });

  test('"New owner" on the property form creates the owner and selects them', async ({ page }) => {
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Add property' }).click();
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();
    await page.getByLabel('Address').fill('12 Owner Lane');
    await page.getByLabel('City').fill('Testville');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'House', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'New owner' }).click();
    await page.getByLabel('Name').fill('Avi Cohen');
    await page.getByRole('button', { name: 'Save' }).last().click();
    await expectToast(page, 'Owner created');
    await expect(page.getByRole('combobox').filter({ hasText: 'Avi Cohen' })).toBeVisible();

    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Property created');
    await page.getByRole('button', { name: 'Maybe later' }).click();

    // In-app navigation: a reload would reset the mock API's in-memory data.
    await page.getByRole('link', { name: 'Property owners' }).first().click();
    await expect(page.getByRole('button', { name: /Avi Cohen/ })).toContainText('1 property');
  });
});
