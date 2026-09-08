import { test, expect, waitForAppReady } from './fixtures';

/**
 * The blocking consent gate.
 *
 * The mock API answers "already accepted" by default, which is what keeps this overlay out
 * of the way of every other spec in the suite (`smoke.spec.ts` in particular walks every
 * protected route). This spec arms the other answer through the same localStorage override
 * the mock reads, set in `addInitScript` so it lands before any app script runs.
 *
 * What is worth pinning down: the gate blocks a route it has no business letting through,
 * and the two ways out both work. The first is the whole point of the feature — a user who
 * signed in with Google was previously never asked at all.
 */
async function withoutAcceptance(page: Parameters<typeof waitForAppReady>[0]) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('legal.mockAccepted', 'off');
    } catch {
      /* ignore */
    }
  });
}

test.describe('legal consent gate', () => {
  test('blocks the app until the documents are accepted', async ({ page }) => {
    await withoutAcceptance(page);
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'One more thing' })).toBeVisible();
    // The gate replaces the route rather than overlaying it: no app chrome behind it.
    await expect(page.locator('main')).toHaveCount(0);
  });

  test('accepting dismisses it and reveals the app', async ({ page, pageErrors }) => {
    await withoutAcceptance(page);
    await page.goto('/home');

    const accept = page.getByRole('button', { name: 'Accept and continue' });
    // Nothing can be accepted before the box is ticked.
    await expect(accept).toBeDisabled();
    await page.getByRole('checkbox').check();
    await expect(accept).toBeEnabled();
    await accept.click();

    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'One more thing' })).toHaveCount(0);
    expect(pageErrors, `uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('the documents are reachable from the gate without accepting', async ({ page }) => {
    await withoutAcceptance(page);
    await page.goto('/home');

    // Public routes, opened in a new tab, so reading them does not pass back through here.
    for (const [name, href] of [['Terms of Service', '/terms'], ['Privacy Policy', '/privacy']]) {
      const link = page.getByRole('link', { name });
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
    }
  });

  test('does not appear for an account that has already accepted', async ({ page }) => {
    await page.goto('/home');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'One more thing' })).toHaveCount(0);
  });
});
