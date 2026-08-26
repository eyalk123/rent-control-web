import { test, expect, dismissTours, enableTours, waitForAppReady } from './fixtures';

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
 *
 * With every tour now wired, arming them arms all of them: Home's page tour opens as soon
 * as first-run closes, and each page visited afterwards opens its own. That is the design
 * (there is no session cap), so these specs assert on the first-run tour's own copy rather
 * than on "no dialog anywhere", and clear whatever else is open before navigating.
 */
test.describe('onboarding — first run', () => {
  test('walks the orientation tour and stays finished', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await expect(card.getByText('Your dashboard')).toBeVisible();
    // Five because the mock reports the assistant enabled, so the optional launcher step
    // is kept. With the assistant off it is dropped and this tour is four steps — that is
    // the whole point of `optional`, and why the count is read rather than assumed.
    await expect(card.getByText('1 of 5')).toBeVisible();

    // The seed: a feature named where the user cannot see it, one tier below the step's
    // own copy. Showing it must not consume the tour it advertises.
    await expect(card.getByText(/record the payment or message the renter/i)).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Your portfolio')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Every shekel')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Ask anything')).toBeVisible();

    // The last step has no anchor — a statement about the product, centred, no cutout.
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Start with one property')).toBeVisible();
    await expect(card.getByText('5 of 5')).toBeVisible();

    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(page.getByText('Start with one property')).toBeHidden();

    // Leaving and coming back must not replay it. There is no server in this mode, so
    // this also covers the case where the write is never acknowledged.
    await dismissTours(page);
    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/properties/);
    await dismissTours(page);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/home/);
    await waitForAppReady(page);
    await expect(page.getByText('Your dashboard')).toBeHidden();
  });

  test('skipping counts as seen', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Your dashboard')).toBeHidden();

    await dismissTours(page);
    await page.getByRole('link', { name: 'Renters' }).click();
    await dismissTours(page);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await waitForAppReady(page);
    await expect(page.getByText('Your dashboard')).toBeHidden();
  });

  test('the spotlight lands on the navigation the viewport is actually showing', async ({
    page,
  }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const spot = document.querySelector('[data-tour-spotlight]');
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

  /**
   * Both of these were reported from real use, and both were one-line causes with no test
   * standing over them: the backdrop carried `onClick={next}`, so any stray click blew
   * through a step; and being fixed on `body` it swallowed wheel events that then chained
   * to an `overflow-hidden` documentElement, freezing a page whose real scroller lives
   * inside AppShell.
   */
  test('clicking outside the card neither advances nor dismisses', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Your dashboard')).toBeVisible();

    // Well away from the card and from the spotlit nav item.
    await page.mouse.click(700, 450);
    await page.mouse.click(700, 500);

    // Same step, still open: not advanced, not skipped.
    await expect(card.getByText('Your dashboard')).toBeVisible();
    await expect(card.getByText('1 of 5')).toBeVisible();
  });

  test('the page still scrolls while a step is showing', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await expect(page.getByRole('dialog')).toBeVisible();

    // AppShell's scroller, not the window — nothing else on the page scrolls.
    const scroller = page.locator('main > div.overflow-y-auto').first();
    await expect(scroller).toBeVisible();
    const before = await scroller.evaluate((el) => el.scrollTop);

    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop), { timeout: 5000 })
      .toBeGreaterThan(before);

    // And the tour is still up — scrolling is not a way out of it.
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
