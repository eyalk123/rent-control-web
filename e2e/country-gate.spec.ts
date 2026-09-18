import { test, expect, waitForAppReady } from './fixtures';

/**
 * The blocking country gate.
 *
 * The mock API answers "Israel" by default, which keeps this overlay out of the way of
 * every other spec. This one arms the unanswered state through the same localStorage
 * override the mock reads, set in `addInitScript` so it lands before any app script runs.
 *
 * What is worth pinning down: that the gate blocks, that a list of ~250 countries can
 * actually be searched, and that **every** country goes straight into the app. The gate
 * used to show non-Israeli accounts a second screen listing what their country does not
 * get yet; there is no tier branch here any more, and a test that one country is treated
 * differently from another would now be testing for the bug.
 *
 * The screen opens on a *chip*, not on the search box: the browser's guess is seeded as a
 * choice, and the search only exists while nothing is chosen. So every helper here that
 * wants to search has to clear first — which is the behaviour under test, not a workaround.
 */
async function withoutCountry(page: Parameters<typeof waitForAppReady>[0]) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('country.mockCountry', 'unset');
    } catch {
      /* ignore */
    }
  });
}

/**
 * Put the search back, whatever the browser guessed.
 *
 * Tolerant of the chip being absent so it can be called unconditionally: the guess depends
 * on the runner's locale, and a helper that assumed a chip was there would be asserting
 * something these tests are not about.
 */
async function clearChoice(page: Parameters<typeof waitForAppReady>[0]) {
  const clear = page.getByRole('button', { name: 'Choose a different country' });
  if (await clear.count()) await clear.click();
}

/** Type enough of the name to find it, then pick it out of the filtered list. */
async function choose(page: Parameters<typeof waitForAppReady>[0], name: string) {
  await clearChoice(page);
  await page.getByPlaceholder('Search countries').fill(name);
  await page.getByRole('option', { name, exact: false }).first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('country gate', () => {
  test('blocks the app until a country is chosen', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toBeVisible();
    // Replaces the route rather than overlaying it: no app chrome behind it.
    await expect(page.locator('main')).toHaveCount(0);
  });

  /**
   * The point of the chip: a choice you can see, and that nothing but the X can change.
   *
   * It used to be a tinted row inside a 250-row scroller — invisible once scrolled past,
   * and replaceable by any stray click anywhere in the list.
   */
  test('the choice replaces the search, and only the X brings it back', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    // Opens already answered, from the browser guess. No search box, no list.
    await expect(page.getByPlaceholder('Search countries')).toHaveCount(0);
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();

    await page.getByRole('button', { name: 'Choose a different country' }).click();
    await expect(page.getByPlaceholder('Search countries')).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(3);
    // Nothing is chosen while the search is open, so there is nothing to confirm.
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await page.getByRole('option', { name: /United Kingdom/ }).click();
    // Straight back to a chip naming it — the list is gone, so it cannot be mis-clicked.
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByPlaceholder('Search countries')).toHaveCount(0);
    await expect(page.getByText('United Kingdom')).toBeVisible();
  });

  test('typing narrows the list to what was typed', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');
    await clearChoice(page);

    const options = page.getByRole('option');
    await expect(options).toHaveCount(3);

    await page.getByPlaceholder('Search countries').fill('united');
    await expect(options).toHaveCount(2);

    // The ISO code is a match too, for anyone who thinks in codes.
    await page.getByPlaceholder('Search countries').fill('il');
    await expect(page.getByRole('option', { name: /Israel/ })).toBeVisible();

    await page.getByPlaceholder('Search countries').fill('zzz');
    await expect(options).toHaveCount(0);
    await expect(page.getByText('No country matches that.')).toBeVisible();
  });

  test('Israel goes straight in', async ({ page, pageErrors }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await choose(page, 'Israel');

    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
    expect(pageErrors, `uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('a supported country goes straight in too, with nothing to read first', async ({
    page,
  }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await choose(page, 'United States');

    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
    // The screen that used to stand here. Its copy is gone from the locale files, so this
    // is a guard against it being reintroduced rather than against a stale string.
    await expect(page.getByText(/-specific features yet/)).toHaveCount(0);
    await expect(page.getByText(/Notify me when you add/)).toHaveCount(0);
  });

  test('an open-ended-tenancy country is not blocked either', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await choose(page, 'United Kingdom');

    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
  });

  test('the chosen country actually drives how money is formatted', async ({ page }) => {
    /*
      The formatters are module state, published once when the config resolves. That makes
      every call site cheap but means a broken chain — config never fetched, effect never
      mounted, wrong field mapped — shows up nowhere except on screen. Hence an integration
      check rather than a unit test of the pure function.
    */
    await withoutCountry(page);
    await page.goto('/home');
    await choose(page, 'United States');
    await waitForAppReady(page);

    const main = page.locator('main');
    await expect(main).toContainText('$');
    await expect(main).not.toContainText('₪');
  });

  test('an Israeli account still sees shekels', async ({ page }) => {
    // The primary regression risk: the default must be Israel's existing behaviour, not a
    // neutral placeholder, so nothing changes for the users who are already here.
    await page.goto('/home');
    await waitForAppReady(page);

    const main = page.locator('main');
    await expect(main).toContainText('₪');
    await expect(main).not.toContainText('$');
  });

  test('does not appear for an account that already has a country', async ({ page }) => {
    await page.goto('/home');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
  });
});

/**
 * Capability gating, seen from the UI.
 *
 * The API is the enforcement point — it rejects an unavailable mode regardless of what the
 * client renders. These tests cover the other half: that the app does not *offer* a control
 * whose value the server will refuse, which is what turns a clean rejection into a user
 * filling in a form and being told no at the end.
 */
test.describe('capability gating', () => {
  /**
   * Put the account in a country without going through the gate.
   *
   * The mock reads this key on every load, so setting it to a real code means the gate
   * never fires — which is what these tests want. Using the gate here instead would
   * re-arm it on the next navigation, because addInitScript runs per page load.
   */
  async function inCountry(page: Parameters<typeof waitForAppReady>[0], code: string) {
    await page.addInitScript((c) => {
      try {
        localStorage.setItem('country.mockCountry', c);
      } catch {
        /* ignore */
      }
    }, code);
  }

  async function openLeaseStep(page: Parameters<typeof waitForAppReady>[0]) {
    await page.goto('/renters/2');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }

  test('an Israeli account is still offered CPI', async ({ page }) => {
    // The primary regression risk. Israel must be completely unaffected.
    await inCountry(page, 'IL');
    await openLeaseStep(page);
    await expect(page.getByRole('button', { name: 'CPI', exact: true })).toBeVisible();
  });

  test('a US account is not offered CPI at all', async ({ page }) => {
    await inCountry(page, 'US');
    await openLeaseStep(page);
    await expect(page.getByRole('button', { name: 'CPI', exact: true })).toHaveCount(0);
    // The modes that do not need an index are untouched.
    await expect(page.getByRole('button', { name: 'Percent', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fixed', exact: true })).toBeVisible();
  });

  test('the CPI notification section is absent for a US account', async ({ page }) => {
    await inCountry(page, 'US');
    await page.goto('/settings/notifications');
    await waitForAppReady(page);
    await expect(page.getByText(/Rent index change|CPI/i)).toHaveCount(0);
  });

  test('the CPI notification section is present for an Israeli account', async ({ page }) => {
    await inCountry(page, 'IL');
    await page.goto('/settings/notifications');
    await waitForAppReady(page);
    await expect(page.getByText(/CPI/i).first()).toBeVisible();
  });
});

/**
 * Supplier payment details.
 *
 * Bank + branch + account picked from a list is an Israeli banking shape. Everywhere else
 * it is one free-text box, because an IBAN, a routing number and a sort code have nothing
 * in common and a validation rule that rejects a valid account is worse than no rule.
 */
test.describe('supplier payment details', () => {
  async function inCountry(page: Parameters<typeof waitForAppReady>[0], code: string) {
    await page.addInitScript((c) => {
      try {
        localStorage.setItem('country.mockCountry', c);
      } catch {
        /* ignore */
      }
    }, code);
  }

  test('Israel keeps the structured bank picker', async ({ page }) => {
    await inCountry(page, 'IL');
    await page.goto('/suppliers');
    await page.getByRole('button', { name: 'Add Supplier' }).click();
    await expect(page.getByText('Bank account')).toBeVisible();
    await expect(page.getByLabel('Payment details')).toHaveCount(0);
  });

  test('a US account gets one free-text field instead', async ({ page }) => {
    await inCountry(page, 'US');
    await page.goto('/suppliers');
    await page.getByRole('button', { name: 'Add Supplier' }).click();
    await expect(page.getByLabel('Payment details')).toBeVisible();
    await expect(page.getByText('Bank account')).toHaveCount(0);
  });
});
