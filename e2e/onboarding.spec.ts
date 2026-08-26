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
    // Eight, and every one of them is conditional on something, which is why the count is
    // read rather than assumed:
    //   - Suppliers and Reports are sidebar-only, so they survive at this viewport (1280)
    //     and are dropped below `lg`, where the bottom bar hides them behind "More";
    //   - the assistant step survives because the mock reports the assistant enabled;
    //   - "start with one property" is *gone*, because the mock account has properties.
    //     That is the ninth step, and it is the one an empty account sees instead.
    await expect(card.getByText('1 of 8')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Your properties')).toBeVisible();
    // The seed: a feature named where the user cannot see it, one tier below the step's
    // own copy. Showing it must not consume the tour it advertises.
    await expect(card.getByText(/scan it and we'll read it/i)).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Your renters')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Every shekel')).toBeVisible();

    // Reports then Suppliers, which is the order the sidebar draws them — Reports closes
    // the main group and Suppliers sits below the "Manage" divider.
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Reports')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Suppliers')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('The bell')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Ask anything')).toBeVisible();
    await expect(card.getByText('8 of 8')).toBeVisible();

    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(page.getByText('Ask anything')).toBeHidden();

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

  /**
   * The second half of the sweep, and the order it runs in — which is the whole point of
   * this pass. It was reported as one tour in a nonsensical order (tabs, then the closing
   * card, then needs-attention, then the bell, then Reports) because the two tours run
   * back to back and nobody had read them as one sequence. They now go chrome first, then
   * this screen top to bottom.
   */
  test('the home sweep follows first-run and walks the screen top to bottom', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Your dashboard')).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();

    // No click of the user's in between: the home tour opens as soon as first-run closes,
    // and it opens on a page-level step — centred, no spotlight — rather than dropping
    // straight from a control in the top bar onto a figure halfway down the page.
    await expect(card.getByText("What's on this screen")).toBeVisible();
    await expect(card.getByText('1 of 6')).toBeVisible();

    const blocks = ['The month so far', 'Quick actions', 'Needs attention', 'Occupancy', 'Recent activity'];
    for (const title of blocks) {
      await card.getByRole('button', { name: 'Next' }).click();
      await expect(card.getByText(title)).toBeVisible();
    }
    await expect(card.getByText('6 of 6')).toBeVisible();

    // The alert-actions seed moved here from first-run's Home step, where it named a
    // feature three screens away from anything it described.
    await card.getByRole('button', { name: 'Back' }).click();
    await card.getByRole('button', { name: 'Back' }).click();
    await expect(card.getByText('Needs attention')).toBeVisible();
    await expect(card.getByText(/record the payment or message the renter/i)).toBeVisible();
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
    await expect(card.getByText('1 of 8')).toBeVisible();
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
