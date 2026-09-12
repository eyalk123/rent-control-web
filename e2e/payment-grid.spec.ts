import { test, expect, expectToast } from './fixtures';

/**
 * The Revenue/Expenses split on the detail pages' Transactions tab.
 *
 * The payment grid derives every month's state from the lease plus the recorded revenue
 * rows — there is no status field to assert against — so these tests pin the derivation:
 * which months are drawn at all, which are payable, and that recording one flips it green
 * and moves the year totals without a reload.
 *
 * Seed data (src/core/api/mock.ts): renter 1 (Sarah Johnson) has a single lease year of
 * ₪26,400 from 2025-06-15, and one ₪2,200 revenue row for 2026-03. The schedule therefore
 * runs Jun 2025 – May 2026, and nothing outside that window is drawn.
 */
test.describe('payment grid', () => {
  test('renter transactions tab splits into Revenue and Expenses', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');
    await expect(page.getByRole('button', { name: 'Revenue', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses', exact: true })).toBeVisible();
  });

  test('grid marks a recorded month paid and leaves later months overdue', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');
    const y2026 = page.locator('[data-year="2026"]');

    // March has a revenue row, for less than the lease says — paid, with a mismatch flag.
    await expect(y2026.getByRole('button', { name: /Mar.*Paid/i })).toBeVisible();
    // January has none and its due day has passed.
    await expect(y2026.getByRole('button', { name: /Jan.*Overdue/i })).toBeVisible();
  });

  test('every lease year is on screen at once, with no year filter', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');

    // Both years the lease touches are stacked, newest first — no chips to click through.
    await expect(page.locator('[data-year="2025"]')).toBeVisible();
    await expect(page.locator('[data-year="2026"]')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Select year' })).toHaveCount(0);

    // The lease started in 2025 and cannot be paid past the current year.
    await expect(page.locator('[data-year="2024"]')).toHaveCount(0);
    await expect(page.locator('[data-year="2027"]')).toHaveCount(0);
  });

  test('months outside the lease are not drawn at all', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');

    // The lease runs Jun 2025 – May 2026: 2025 starts at June and 2026 stops after May.
    await expect(page.locator('[data-year="2025"]').getByRole('button', { name: /Jan/i })).toHaveCount(0);
    await expect(page.locator('[data-year="2025"]').getByRole('button', { name: /Jun/i })).toBeVisible();
    await expect(page.locator('[data-year="2026"]').getByRole('button', { name: /Jun/i })).toHaveCount(0);
    await expect(page.locator('[data-year="2026"]').getByRole('button', { name: /May/i })).toBeVisible();
  });

  test('a month takes two clicks to record, and the second one moves the totals', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');
    const y2026 = page.locator('[data-year="2026"]');

    const summary = y2026.getByText(/collected of/);
    await expect(summary).toContainText('2,200');
    await expect(y2026.getByText('4 months outstanding')).toBeVisible();

    // The first click only arms the box — a 12-box target is easy to misclick, so nothing
    // is written until the same box is clicked again.
    await y2026.getByRole('button', { name: /Feb.*Overdue/i }).click();
    await expect(page.getByText(/Click Feb 2026 again to record/)).toBeVisible();
    await expect(summary).toContainText('2,200');

    await y2026.getByRole('button', { name: /Feb/i }).click();
    await expectToast(page, 'Payment recorded');

    // Recomputed in place: February is paid and the year totals moved.
    await expect(y2026.getByRole('button', { name: /Feb.*Paid/i })).toBeVisible();
    await expect(summary).toContainText('28,600');
    await expect(y2026.getByText('3 months outstanding')).toBeVisible();
  });

  test('a recording month never flashes back to overdue on its way to paid', async ({ page }) => {
    // The create mutation used to fire its cache invalidations without awaiting them, so
    // `mutateAsync` resolved on the write alone. The panel then cleared its in-flight state
    // while the cache still held the old rows, and the cell rendered the red "overdue" state
    // again between the amber armed state and the green paid one.
    //
    // Latency is the whole point here: the mock answers in-process, so with no delay the
    // refetch lands in the same frame and the regression is invisible. 600ms is comfortably
    // wider than a frame without making the test slow.
    await page.addInitScript(() => {
      (window as unknown as { __mockLatencyMs: number }).__mockLatencyMs = 600;
    });
    await page.goto('/renters/1?tab=transactions');

    const y2026 = page.locator('[data-year="2026"]');
    const may = y2026.getByRole('button', { name: /May.*Overdue/i });
    await expect(may).toBeVisible();

    // Sample every frame from *before* the first click, so the run starts on red — which is
    // what proves the sampler works when the assertion below finds no red later.
    await page.evaluate(() => {
      const year = document.querySelector('[data-year="2026"]')!;
      const cell = [...year.querySelectorAll('button')].find((b) =>
        (b.getAttribute('aria-label') ?? '').startsWith('May'),
      )!;
      const w = window as unknown as { __frames: string[] };
      w.__frames = [];
      const tick = () => {
        const c = getComputedStyle(cell).backgroundColor;
        if (w.__frames[w.__frames.length - 1] !== c) w.__frames.push(c);
        requestAnimationFrame(tick);
      };
      tick();
    });

    await may.click(); // arm
    await expect(page.getByText(/Click May 2026 again to record/)).toBeVisible();
    await may.click(); // record
    await expect(y2026.getByRole('button', { name: /May.*Paid/i })).toBeVisible();

    const frames = await page.evaluate(
      () => (window as unknown as { __frames: string[] }).__frames,
    );
    const isRed = (c: string) => /220, 38, 38/.test(c);
    const isAmber = (c: string) => /217, 119, 6/.test(c);
    const trace = JSON.stringify(frames);

    // The sampler ran and caught both endpoints of the gesture.
    expect(frames.some(isRed), `never sampled the overdue state: ${trace}`).toBe(true);
    expect(frames.some(isAmber), `never sampled the armed state: ${trace}`).toBe(true);
    // …and red never came back once the cell was armed.
    const firstAmber = frames.findIndex(isAmber);
    const lastRed = frames.map(isRed).lastIndexOf(true);
    expect(lastRed, `overdue red re-appeared after arming: ${trace}`).toBeLessThan(firstAmber);
  });

  test('several months can be recorded at once without waiting for each other', async ({ page }) => {
    // Recording used to be serialised: one in-flight flag, and `armed` was only cleared once
    // the write returned, so a month armed during the previous flight got wiped by it.
    // The latency has to outlast six Playwright clicks, or the first write lands before the
    // last one starts and the overlap is no longer observable.
    await page.addInitScript(() => {
      (window as unknown as { __mockLatencyMs: number }).__mockLatencyMs = 2500;
    });
    await page.goto('/renters/1?tab=transactions');

    const y2026 = page.locator('[data-year="2026"]');
    await expect(y2026.getByText('4 months outstanding')).toBeVisible();

    // Fire three months back to back, never waiting for a write to land.
    for (const month of ['Jan', 'Feb', 'Apr']) {
      const box = y2026.getByRole('button', { name: new RegExp(`${month}.*Overdue`, 'i') });
      await box.click(); // arm
      await box.click(); // commit — returns immediately, write continues in the background
    }

    // All three are in flight at the same moment. A cell being written is disabled but still
    // reads as overdue, since the row it is waiting on has not reached the cache yet — a
    // settled cell is either payable (enabled) or paid. Deliberately not asserting on colour:
    // the last cell clicked is still mid-transition when this runs.
    const inFlight = await y2026.evaluate((root) =>
      [...root.querySelectorAll('button')].filter(
        (b) => b.disabled && /Overdue/i.test(b.getAttribute('aria-label') ?? ''),
      ).length,
    );
    // Two is enough to prove they overlap; the exact count depends on how fast Playwright
    // gets through six clicks, which is not something to assert on under parallel load.
    expect(inFlight, 'the writes were serialised instead of overlapping').toBeGreaterThanOrEqual(2);

    // …and they all land.
    for (const month of ['Jan', 'Feb', 'Apr']) {
      await expect(y2026.getByRole('button', { name: new RegExp(`${month}.*Paid`, 'i') })).toBeVisible();
    }
    await expect(y2026.getByText('1 month outstanding')).toBeVisible();
    // The load-bearing assertion, and the only timing-independent one: a single toast naming
    // all three. Serialised writes would drain `pending` between each and emit three separate
    // "Payment recorded" toasts instead.
    await expectToast(page, '3 payments recorded');
  });

  test('arming a different month moves the arming instead of recording', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');
    const y2026 = page.locator('[data-year="2026"]');

    await y2026.getByRole('button', { name: /Jan.*Overdue/i }).click();
    await expect(page.getByText(/Click Jan 2026 again to record/)).toBeVisible();

    await y2026.getByRole('button', { name: /Apr.*Overdue/i }).click();
    await expect(page.getByText(/Click Apr 2026 again to record/)).toBeVisible();
    await expect(page.getByText(/Click Jan 2026 again to record/)).toHaveCount(0);

    // Nothing was written by moving between them.
    await expect(y2026.getByText('4 months outstanding')).toBeVisible();
  });

  test('property tab keeps its year filter and shows a row per renter', async ({ page }) => {
    await page.goto('/properties/1?tab=transactions');
    await expect(page.getByRole('group', { name: 'Select year' })).toBeVisible();
    // Matrix row headers are <bdi>; the hero also names the first renter, so match on the
    // row header specifically.
    await expect(page.locator('bdi').filter({ hasText: 'Sarah Johnson' })).toBeVisible();
    await expect(page.locator('bdi').filter({ hasText: 'Michael Chen' })).toBeVisible();
  });

  test('expenses tab charts spend and filters by category', async ({ page }) => {
    await page.goto('/properties/1?tab=transactions');
    await page.getByRole('button', { name: 'Expenses', exact: true }).click();

    await expect(page.getByText('Biggest category')).toBeVisible();

    // The ranked breakdown row is a button; clicking it filters the list below.
    await page.getByRole('button', { name: /Maintenance/ }).first().click();
    await expect(page.getByRole('button', { name: 'Clear filter' })).toBeVisible();
  });

  test('the section and its filters survive a trip through another tab', async ({ page }) => {
    await page.goto('/renters/1?tab=transactions');

    await page.getByRole('button', { name: 'Expenses', exact: true }).click();
    await expect(page).toHaveURL(/section=expenses/);

    // Leaving the tab unmounts the panel entirely, which is what used to reset it.
    await page.getByRole('button', { name: /Lease info/i }).click();
    await page.getByRole('button', { name: /^Transactions/i }).click();

    await expect(page.getByRole('button', { name: 'Expenses', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

/**
 * Non-monthly leases.
 *
 * The cadence is stored as instalments per year (12 / 4 / 1) and every surface has to agree
 * about it: the grid only bills on the months the cycle lands on, it bills the whole
 * instalment when it does, and the months in between are drawn as deliberately empty rather
 * than left blank — a yearly lease used to render as eleven holes and look broken.
 *
 * Seed data (src/core/api/mock.ts): renter 4 (James Wilson, property 3) is quarterly and
 * renter 6 (Robert Thompson, property 4) is yearly, both starting 1 January two years ago.
 * A January start is what puts the quarterly cycle on Jan/Apr/Jul/Oct.
 */
test.describe('payment grid — quarterly and yearly leases', () => {
  const QUARTERLY_YEAR = new Date().getFullYear() - 1;

  test('off-months are drawn, visibly inert, and not clickable', async ({ page }) => {
    await page.goto('/renters/4?tab=transactions');
    const year = page.locator(`[data-year="${QUARTERLY_YEAR}"]`);
    await expect(year).toBeVisible();

    // The whole point of the change: February is on screen and accounted for, where it used
    // to be an unexplained gap.
    const feb = year.locator('[data-status="not-due"]').filter({ hasText: 'Feb' });
    await expect(feb).toBeVisible();
    await expect(feb).toHaveAttribute('aria-label', /Not due/i);
    await expect(feb).toHaveAttribute('aria-label', /quarterly/i);

    // …and it is a div, not a disabled button: there is nothing here to press at all.
    await expect(year.getByRole('button', { name: /^Feb/ })).toHaveCount(0);

    // Eight of the twelve months are off-cycle.
    await expect(year.locator('[data-status="not-due"]')).toHaveCount(8);
  });

  test('a quarterly lease bills only on its cycle months, and bills the whole instalment', async ({ page }) => {
    await page.goto('/renters/4?tab=transactions');
    const year = page.locator(`[data-year="${QUARTERLY_YEAR}"]`);

    // Jan/Apr/Jul/Oct are the only payable cells.
    for (const month of ['Jan', 'Apr', 'Jul', 'Oct']) {
      await expect(year.getByRole('button', { name: new RegExp(`^${month}`) })).toBeVisible();
    }
    for (const month of ['Feb', 'Mar', 'May', 'Jun', 'Aug', 'Sep', 'Nov', 'Dec']) {
      await expect(year.getByRole('button', { name: new RegExp(`^${month}`) })).toHaveCount(0);
    }

    // Year two of the lease is ₪25,900/month, so a quarter is three of those.
    await expect(year.getByRole('button', { name: /^Jan/ })).toHaveAttribute(
      'aria-label',
      /77,700/,
    );

    // Four instalments of three months still adds up to a full year of rent, so the summary
    // is unchanged by the cadence.
    await expect(year.getByText(/collected of/)).toContainText('310,800');
  });

  test('the row names the cadence, and a monthly lease shows no badge', async ({ page }) => {
    await page.goto('/renters/4?tab=transactions');
    await expect(page.getByText('Quarterly', { exact: true }).first()).toBeVisible();

    await page.goto('/renters/1?tab=transactions');
    await expect(page.getByText('Quarterly', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Yearly', { exact: true })).toHaveCount(0);
  });

  test('a yearly lease owes once a year', async ({ page }) => {
    await page.goto('/renters/6?tab=transactions');
    const year = page.locator(`[data-year="${QUARTERLY_YEAR}"]`);

    await expect(page.getByText('Yearly', { exact: true }).first()).toBeVisible();
    await expect(year.locator('[data-status="not-due"]')).toHaveCount(11);
    await expect(year.getByRole('button', { name: /^Jan/ })).toBeVisible();
    // Twelve months of ₪24,100.
    await expect(year.getByRole('button', { name: /^Jan/ })).toHaveAttribute('aria-label', /289,200/);
  });

  test('recording a quarterly month writes one whole instalment', async ({ page }) => {
    await page.goto('/renters/4?tab=transactions');
    const year = page.locator(`[data-year="${QUARTERLY_YEAR}"]`);

    const jan = year.getByRole('button', { name: /^Jan/ });
    await jan.click();
    // The armed hint names the amount the second click will write — three months, not one.
    await expect(page.getByText(/Click Jan .* again to record/)).toBeVisible();
    await jan.click();
    await expectToast(page, 'Payment recorded');

    // Paid, and with no amber "differs from the lease" marker: the amount written is exactly
    // what the schedule asked for. Writing three monthly rows instead is what used to leave a
    // permanent mismatch flag on every cycle month.
    await expect(year.getByRole('button', { name: /Jan.*Paid/i })).toBeVisible();
    await expect(year.getByRole('button', { name: /Jan.*Paid/i })).not.toHaveAttribute(
      'aria-label',
      /expected/i,
    );
  });
});
