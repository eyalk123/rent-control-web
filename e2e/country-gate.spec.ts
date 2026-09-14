import { test, expect, waitForAppReady } from './fixtures';

/**
 * The blocking country gate.
 *
 * The mock API answers "Israel" by default, which keeps this overlay out of the way of
 * every other spec. This one arms the unanswered state through the same localStorage
 * override the mock reads, set in `addInitScript` so it lands before any app script runs.
 *
 * What is worth pinning down: that the gate blocks, that **no country is ever refused**,
 * that the skimmed disclosure actually gets seen rather than being skipped past by the
 * cache update, and that Israel goes straight through without being shown a screen telling
 * it nothing is missing.
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

test.describe('country gate', () => {
  test('blocks the app until a country is chosen', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toBeVisible();
    // Replaces the route rather than overlaying it: no app chrome behind it.
    await expect(page.locator('main')).toHaveCount(0);
  });

  test('Israel goes straight in, with nothing to disclose', async ({ page, pageErrors }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await page.getByLabel('Country').selectOption('IL');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Tier N is the full product, so the skimmed notice must not appear at all.
    await waitForAppReady(page);
    await expect(page.getByText(/We don't have .*-specific features yet/)).toHaveCount(0);
    expect(pageErrors, `uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('a supported country is told what is missing before going in', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await page.getByLabel('Country').selectOption('US');
    await page.getByRole('button', { name: 'Continue' }).click();

    // The disclosure must survive the write — the mutation deliberately does not update
    // the cache, or this screen would be unmounted before it could be read.
    await expect(page.getByRole('heading', { name: 'Rent Control in United States' })).toBeVisible();
    await expect(page.getByText(/without rent index linkage/)).toBeVisible();
    await expect(page.getByText(/USD/)).toBeVisible();

    await page.getByRole('button', { name: 'Get started' }).click();
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
  });

  test('an open-ended-tenancy country gets the extra sentence, and is not blocked', async ({
    page,
  }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await page.getByLabel('Country').selectOption('GB');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText(/usually open-ended/)).toBeVisible();
    // The whole point of dropping the blocked tier: they still reach the app.
    await page.getByRole('button', { name: 'Get started' }).click();
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Where are your properties?' })).toHaveCount(0);
  });

  test('notify-me is offered and acknowledges', async ({ page }) => {
    await withoutCountry(page);
    await page.goto('/home');

    await page.getByLabel('Country').selectOption('US');
    await page.getByRole('button', { name: 'Continue' }).click();

    const notify = page.getByRole('button', { name: 'Notify me when you add United States' });
    await expect(notify).toBeVisible();
    await notify.click();
    await expect(page.getByRole('button', { name: "We'll let you know" })).toBeDisabled();
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
    await page.getByLabel('Country').selectOption('US');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Get started' }).click();
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
