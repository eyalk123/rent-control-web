import { test, expect, enableTours, waitForAppReady } from './fixtures';

/**
 * The first-run tour, which is the only tour that runs unconditionally (gate: `always`).
 *
 * Tours are suppressed for the rest of the suite because this one is a click-blocking
 * overlay on `/home`; `enableTours` arms them for this spec only.
 *
 * The two behaviours worth pinning down here are the ones that were actually broken
 * during development and would fail silently rather than loudly:
 *   - the spotlight has to land on the navigation variant the viewport is *showing*,
 *     since all three are in the DOM at every width;
 *   - finishing a tour has to keep it finished, including with no server to persist to.
 */
test.describe('onboarding — first run', () => {
  test('walks the orientation tour and stays finished', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await expect(card.getByText('Your dashboard')).toBeVisible();
    await expect(card.getByText('1 of 4')).toBeVisible();

    // The seed: a feature named where the user cannot see it, one tier below the step's
    // own copy. Showing it must not consume the tour it advertises.
    await expect(card.getByText(/record the payment or message the renter/i)).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Your portfolio')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Every shekel')).toBeVisible();

    // The last step has no anchor — a statement about the product, centred, no cutout.
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Start with one property')).toBeVisible();
    await expect(card.getByText('4 of 4')).toBeVisible();

    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toBeHidden();

    // Leaving and coming back must not replay it. There is no server in this mode, so
    // this also covers the case where the write is never acknowledged.
    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/properties/);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/home/);
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('skipping counts as seen', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toBeHidden();

    await page.getByRole('link', { name: 'Renters' }).click();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('the spotlight lands on the navigation the viewport is actually showing', async ({
    page,
  }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const spot = document.querySelector('div.pointer-events-none.fixed');
      const visible = [...document.querySelectorAll('a[href="/home"]')].find((el) =>
        (el as HTMLElement).checkVisibility(),
      );
      if (!spot || !visible) return null;
      const s = spot.getBoundingClientRect();
      const a = visible.getBoundingClientRect();
      return { dx: Math.round(a.x - s.x), dy: Math.round(a.y - s.y) };
    });

    // All three navigation variants claim this anchor and two of them are hidden, so a
    // registry that kept only the last registration would point at nothing here.
    expect(geometry).not.toBeNull();
    expect(geometry).toEqual({ dx: 8, dy: 8 });
  });

  test('does not appear at all when tours are not armed', async ({ page }) => {
    await page.goto('/home');
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
