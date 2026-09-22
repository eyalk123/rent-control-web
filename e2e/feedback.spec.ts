import { test, expect, expectToast } from './fixtures';

test.describe('feedback', () => {
  async function openDrawer(page: import('@playwright/test').Page) {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Write a message' }).click();
    await expect(page.getByRole('heading', { name: 'Send us a message' })).toBeVisible();
  }

  test('settings offers a way to write in', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Write a message' })).toBeVisible();
  });

  test('the top bar opens it from anywhere, without leaving the page', async ({ page }) => {
    // The point of the top-bar button: report the bug from the screen the bug is on.
    await page.goto('/properties');
    await page.getByRole('button', { name: 'Send us a message', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Send us a message' })).toBeVisible();
    await expect(page).toHaveURL(/\/properties/);
  });

  test('the top-bar button survives a phone-width viewport', async ({ page }) => {
    // Four action buttons plus the search trigger is the tightest the bar gets.
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto('/properties');

    const button = page.getByRole('button', { name: 'Send us a message', exact: true });
    await expect(button).toBeInViewport();
    await button.click();
    await expect(page.getByRole('heading', { name: 'Send us a message' })).toBeVisible();
  });

  test('an empty message is rejected', async ({ page }) => {
    await openDrawer(page);
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(page.getByText(/required/i).first()).toBeVisible();
    await expect(page.getByText('your message is on its way')).toHaveCount(0);
  });

  test('can send a bug report (round-trip)', async ({ page }) => {
    await openDrawer(page);
    await page.getByLabel('Your message').fill('The CPI row shows the wrong index month.');
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    await expectToast(page, 'your message is on its way');
    // The drawer closes on success — there is no in-app record to return to.
    await expect(page.getByRole('heading', { name: 'Send us a message' })).toHaveCount(0);
  });

  test('type can be changed before sending', async ({ page }) => {
    await openDrawer(page);
    await page.getByRole('button', { name: 'Suggestion' }).click();

    // The placeholder follows the type, which is how the form signals it heard you.
    await expect(page.getByPlaceholder('What would make RentVance better for you?')).toBeVisible();

    await page.getByLabel('Your message').fill('Let me export a single property.');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expectToast(page, 'your message is on its way');
  });

  test('warns that screenshots may carry renter details', async ({ page }) => {
    await openDrawer(page);
    await expect(page.getByText("Screenshots may include your renters' details.")).toBeVisible();
  });
});
