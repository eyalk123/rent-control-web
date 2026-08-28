import type { Locator } from '@playwright/test';
import { test, expect, dismissTours, enableTours, waitForAppReady } from './fixtures';

/**
 * How far the spotlight sits outside the element it is highlighting. The overlay pads
 * by 8px on every side, so a step pointing at the right element reads `{ dx: 8, dy: 8 }`
 * and one pointing at anything else does not. Null while either box is still settling,
 * which is why callers poll.
 */
async function inset(spotlight: Locator, target: Locator) {
  const spot = await spotlight.boundingBox();
  const el = await target.boundingBox();
  if (!spot || !el) return null;
  return { dx: Math.round(el.x - spot.x), dy: Math.round(el.y - spot.y) };
}

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
    // The tour arrives before it points at anything: an unanchored first step, drawn as a
    // larger title card rather than the one built to sit beside a spotlight.
    await expect(card.getByText('Welcome to Rent Control')).toBeVisible();
    await expect(card.locator('[data-tour-title-card]').or(page.locator('[data-tour-title-card]'))).toHaveCount(1);
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Your dashboard')).toBeVisible();
    // Eight, and every one of them is conditional on something, which is why the count is
    // read rather than assumed:
    //   - Suppliers and Reports are sidebar-only, so they survive at this viewport (1280)
    //     and are dropped below `lg`, where the bottom bar hides them behind "More";
    //   - the assistant step survives because the mock reports the assistant enabled;
    //   - "start with one property" is *gone*, because the mock account has properties.
    //     That is the ninth step, and it is the one an empty account sees instead.
    await expect(card.getByText('2 of 9')).toBeVisible();

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
    await expect(card.getByText('9 of 9')).toBeVisible();

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
    await expect(card.getByText('Welcome to Rent Control')).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();

    // No click of the user's in between: the home tour opens as soon as first-run closes,
    // and it opens on a page-level step — centred, no spotlight — rather than dropping
    // straight from a control in the top bar onto a figure halfway down the page.
    await expect(card.getByText("What's on this screen")).toBeVisible();
    await expect(card.getByText('1 of 7')).toBeVisible();

    const blocks = [
      'The month so far',
      'Quick actions',
      'Needs attention',
      'Reminder settings',
      'Occupancy',
      'Recent activity',
    ];
    for (const title of blocks) {
      await card.getByRole('button', { name: 'Next' }).click();
      await expect(card.getByText(title)).toBeVisible();
    }
    await expect(card.getByText('7 of 7')).toBeVisible();

    // The alert-actions seed moved here from first-run's Home step, where it named a
    // feature three screens away from anything it described.
    for (let i = 0; i < 3; i++) await card.getByRole('button', { name: 'Back' }).click();
    await expect(card.getByText('Needs attention')).toBeVisible();
    await expect(card.getByText(/record the payment or message the renter/i)).toBeVisible();
  });

  /**
   * Reminder settings are reachable from Home itself, not only from inside the alerts
   * panel. This is the step that says so, and the assertion that matters is that the
   * spotlight is actually on the control — that step used to point inside the panel, and
   * when the measurement missed it the step quietly degraded to a card highlighting
   * nothing at all.
   */
  test('the reminder-settings step points at the control on Home', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Welcome to Rent Control')).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card.getByText("What's on this screen")).toBeVisible();

    // On the page from the start, with no panel to open first.
    const manage = page.getByRole('button', { name: /manage notifications/i }).first();
    await expect(manage).toBeVisible();

    for (let i = 0; i < 4; i++) await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Reminder settings')).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const spot = document.querySelector('[data-tour-spotlight]');
          const btn = [...document.querySelectorAll('button')].find((b) =>
            /manage notifications/i.test(b.textContent ?? ''),
          );
          if (!spot || !btn) return null;
          const s = spot.getBoundingClientRect();
          const b = btn.getBoundingClientRect();
          return { dx: Math.round(b.x - s.x), dy: Math.round(b.y - s.y) };
        }),
      )
      .toEqual({ dx: 8, dy: 8 });
  });

  /**
   * Properties and Renters are the same kind of screen, so their tours were explaining the
   * Add menu, multi-select, search persistence and the table view once per tab, in wording
   * that differed only in the noun. Whichever tab is opened first says them.
   *
   * There is no server here, so this leans on the optimistic cache write surviving —
   * `patchTourState` returns null in mock mode and `onSuccess` deliberately does not
   * overwrite. One page session is therefore enough to cover both halves.
   */
  test('a step shared between Properties and Renters is only said once', async ({ page }) => {
    await enableTours(page);
    await page.goto('/renters');
    await waitForAppReady(page);

    // Renters first, in full: eight steps, ending on the table view.
    const card = page.getByRole('dialog');
    await expect(card.getByText('Your renters')).toBeVisible();
    await expect(card.getByText('1 of 8')).toBeVisible();
    for (let i = 0; i < 7; i++) await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('And the same list as a table')).toBeVisible();
    await card.getByRole('button', { name: 'Got it' }).click();

    // Properties second: only what Renters could not have said.
    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/properties/);
    await waitForAppReady(page);

    await expect(card.getByText('Your properties')).toBeVisible();
    await expect(card.getByText('1 of 3')).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('The line that counts')).toBeVisible();
    await card.getByRole('button', { name: 'Next' }).click();
    // Kept, not shared: a property card and a renter card show different things.
    await expect(card.getByText('Cards')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Got it' })).toBeVisible();
  });

  /**
   * The display-mode demo. Two things have to hold: the list really does change behind
   * the card, and the user's saved preference is not touched by it — the tour overrides
   * what is rendered, it does not choose for them.
   */
  test('the properties tour shows both display modes without changing the saved one', async ({ page }) => {
    await enableTours(page);
    await page.goto('/properties');
    await waitForAppReady(page);
    await page.evaluate(() => localStorage.setItem('app_list_view:properties', 'card'));

    const card = page.getByRole('dialog');
    await expect(card.getByText('Your properties')).toBeVisible();

    for (let i = 0; i < 5; i++) await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Cards')).toBeVisible();
    await expect(page.locator('main table')).toBeHidden();

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('And the same list as a table')).toBeVisible();
    await expect(page.locator('main table')).toBeVisible();

    // Still the user's choice, both during the demo and after it.
    expect(await page.evaluate(() => localStorage.getItem('app_list_view:properties'))).toBe('card');
    await card.getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('main table')).toBeHidden();
  });

  test('skipping counts as seen', async ({ page }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Welcome to Rent Control')).toBeHidden();

    await dismissTours(page);
    await page.getByRole('link', { name: 'Renters' }).click();
    await dismissTours(page);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await waitForAppReady(page);
    await expect(page.getByText('Welcome to Rent Control')).toBeHidden();
  });

  test('the spotlight lands on the navigation the viewport is actually showing', async ({
    page,
  }) => {
    await enableTours(page);
    await page.goto('/home');
    await waitForAppReady(page);
    // Past the welcome card: it is unanchored, so there is no spotlight on it to measure.
    await page.getByRole('dialog').getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('dialog').getByText('Your dashboard')).toBeVisible();

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
    await expect(card.getByText('Welcome to Rent Control')).toBeVisible();

    // Well clear of the card, which on this step is the wide centred title card.
    await page.mouse.click(150, 650);
    await page.mouse.click(1100, 650);

    // Same step, still open: not advanced, not skipped.
    await expect(card.getByText('Welcome to Rent Control')).toBeVisible();
    await expect(card.getByText('1 of 9')).toBeVisible();
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

  /**
   * Two adjacent steps must not point at the same thing.
   *
   * "Which month it pays for" and "Recording rent" were both anchored on the add button,
   * so the tour spotlighted one control twice while saying unrelated things about it —
   * reported as not understanding where the first step was meant to be looking. The month
   * step now points at the month heading, which is where that fact is actually visible.
   */
  test('the month step and the recording step point at different things', async ({ page }) => {
    await enableTours(page);
    // Through Properties rather than straight to /transactions: this tour is gated on
    // `hasProperties`, and the gate reads the query cache passively, so it cannot be
    // answered until some screen has actually loaded properties. Landing directly on
    // Transactions defers the tour — by design, see useGates.
    await page.goto('/properties');
    await waitForAppReady(page);
    await dismissTours(page);
    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page).toHaveURL(/\/transactions/);
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Every shekel, in one place')).toBeVisible();

    // Overview, hero, filter bar, then the month heading — down the screen in order.
    for (let i = 0; i < 3; i++) await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Which month it pays for')).toBeVisible();

    // The heading above the first month's rows — "March 2026" — not the button below it.
    const monthHeading = page
      .locator('main p')
      .filter({ hasText: /^[A-Za-z֐-׿]+ \d{4}$/ })
      .first();
    const spotlight = page.locator('[data-tour-spotlight]');
    // The anchored element is the heading row, not the month text inside it.
    await expect.poll(() => inset(spotlight, monthHeading.locator('..'))).toEqual({ dx: 8, dy: 8 });

    const monthBox = (await spotlight.boundingBox())!;

    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.getByText('Two kinds of money')).toBeVisible();
    // The seed rides here now, not on the month step above it.
    await expect(card.getByText(/nothing is charged automatically/i)).toBeVisible();

    await card.getByRole('button', { name: 'Next' }).click();
    // By heading: the seed line under it opens with the same two words.
    await expect(card.getByRole('heading', { name: 'Recording rent' })).toBeVisible();
    const addButton = page.getByRole('button', { name: /add transaction/i }).first();
    await expect.poll(() => inset(spotlight, addButton)).toEqual({ dx: 8, dy: 8 });

    // The point of the fix: the two steps do not highlight the same rectangle.
    const addBox = (await spotlight.boundingBox())!;
    expect(Math.abs(addBox.y - monthBox.y)).toBeGreaterThan(20);
  });

  /**
   * Resetting has to undo a *skip*, not only a completion.
   *
   * A skipped tour is remembered twice — in the persisted state, which "Show tours again"
   * clears, and in a session-lived set inside the controller, which it could not reach. So
   * the one tour a user had actively dismissed was the one the reset appeared to ignore.
   */
  test('resetting brings back a tour that was skipped, not only finished ones', async ({
    page,
  }) => {
    await enableTours(page);
    await page.goto('/properties');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Your properties')).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toBeHidden();

    // Gone, as it should be until asked for again.
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await dismissTours(page);
    await page.getByRole('link', { name: 'Properties' }).click();
    await waitForAppReady(page);
    await expect(page.getByText('Your properties')).toBeHidden();

    // Through the nav, not `page.goto`: a full load would wipe the session-lived set this
    // is about, and the test would pass with the bug still in place.
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await waitForAppReady(page);
    await dismissTours(page);
    await page.getByRole('button', { name: 'Reset tours' }).click();

    await page.getByRole('link', { name: 'Properties' }).click();
    await waitForAppReady(page);
    await expect(card.getByText('Your properties')).toBeVisible();
  });

  /**
   * The form tours open with a card of their own and then walk a form whose second page is
   * not mounted yet. The steps that point there are `revealsAnchor`, and the drawer *derives*
   * the page it shows from the running step — so the last assertion here is the real one: when
   * the tour ends the drawer is back on the page the user was actually filling in, because
   * nothing ever wrote to its state.
   */
  test('the property form tour shows page two without moving the user off page one', async ({
    page,
  }) => {
    await enableTours(page);
    await page.goto('/properties');
    await waitForAppReady(page);
    await dismissTours(page);

    await page.getByRole('button', { name: 'Add property' }).click();
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();

    const card = page.getByRole('dialog', { name: 'Adding a property' });
    await expect(card).toBeVisible();
    await expect(card.getByText('1 of 4')).toBeVisible();

    // Page one, and the drawer still on it. The drawer's own indicator is what to assert
    // against — it reads the page being shown, so it moves exactly when the demo does.
    const drawer = page.getByRole('dialog', { name: 'Add Property' });
    await expect(drawer.getByText('1/2')).toBeVisible();
    await expect(drawer.getByRole('textbox', { name: 'Address' })).toBeVisible();

    const tourCard = page.getByRole('dialog').filter({ hasText: 'of 4' });
    await tourCard.getByRole('button', { name: 'Next' }).click();
    await expect(tourCard.getByText('Two steps')).toBeVisible();

    // The owner field lives on page two, which was not mounted a moment ago.
    await tourCard.getByRole('button', { name: 'Next' }).click();
    await expect(tourCard.getByText('Property owner')).toBeVisible();
    await expect(drawer.getByText('2/2')).toBeVisible();
    await expect(drawer.getByRole('textbox', { name: 'Address' })).toBeHidden();

    await tourCard.getByRole('button', { name: 'Next' }).click();
    await expect(tourCard.getByText('Bills and paperwork')).toBeVisible();
    await tourCard.getByRole('button', { name: 'Got it' }).click();

    // Back on page one: the tour demonstrated page two, it did not move anyone there.
    await expect(drawer.getByText('1/2')).toBeVisible();
    await expect(drawer.getByRole('textbox', { name: 'Address' })).toBeVisible();
  });

  /**
   * Both halves of the transaction form, and both were reported broken: revenue showed no
   * tour at all, and expense walked its two steps in the wrong order.
   *
   * Revenue's tour used to be asked for from the renter checklist, which does not exist until
   * a property has been chosen — so opening the form and looking at it got nothing. Expense
   * pointed at the category field before the property picker, which is four fields above it.
   */
  test('the transaction form tours open with the form and read down it', async ({ page }) => {
    await enableTours(page);
    await page.goto('/transactions');
    await waitForAppReady(page);
    // First-run and then the transactions tour open back to back here, and the second one
    // waits for the list to have rows — so "which is up" is a race. Clear until nothing is
    // up and stays that way; the overlay swallows clicks outside its own card, so a tour
    // left open makes the next click land on nothing.
    for (let i = 0; i < 6; i++) {
      await dismissTours(page);
      await page.waitForTimeout(300);
      if ((await page.getByRole('dialog').count()) === 0) break;
    }

    await page.getByRole('button', { name: 'Add transaction' }).click();
    await page.getByRole('button', { name: 'Revenue', exact: true }).click();

    // Nothing selected yet — which is exactly the state that used to show no tour.
    const revenue = page.getByRole('dialog').filter({ hasText: 'of 4' });
    await expect(revenue.getByText('Rent coming in')).toBeVisible();
    await revenue.getByRole('button', { name: 'Next' }).click();
    await expect(revenue.getByText('Pick the properties')).toBeVisible();
    await revenue.getByRole('button', { name: 'Next' }).click();
    await expect(revenue.getByText('Which months')).toBeVisible();
    // Four, not five: the per-row override step drops while there are no rows to point at.
    await revenue.getByRole('button', { name: 'Next' }).click();
    await expect(revenue.getByText('4 of 4')).toBeVisible();
    await revenue.getByRole('button', { name: 'Got it' }).click();

    // Expense, down the form: the property picker first, the category field after it.
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Expense', exact: true }).click();

    const expense = page.getByRole('dialog').filter({ hasText: 'of 3' });
    await expect(expense.getByText('Money going out')).toBeVisible();
    await expense.getByRole('button', { name: 'Next' }).click();
    await expect(expense.getByText('One bill, several units')).toBeVisible();
    await expense.getByRole('button', { name: 'Next' }).click();
    await expect(expense.getByRole('heading', { name: 'Categories' })).toBeVisible();
  });
});
