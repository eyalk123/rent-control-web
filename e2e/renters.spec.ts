import { test, expect, expectToast } from './fixtures';

test.describe('renters', () => {
  test('list shows seeded renters', async ({ page }) => {
    await page.goto('/renters');
    await expect(page.getByRole('heading', { name: 'Renters' })).toBeVisible();
    await expect(page.getByText('Michael Chen')).toBeVisible();
    await expect(page.getByText('Emily Davis')).toBeVisible();
  });

  // The default view is "current tenants". Renter 1 (Sarah Johnson) is seeded with a lease
  // that ran Jun 2025 - May 2026, so she belongs under Ended — and used to show a green
  // "Active" pill there, because the status came from the overdue/expiring lists only.
  test('a lease that has run out is filed under Ended, not Active', async ({ page }) => {
    await page.goto('/renters');
    await expect(page.getByText('Sarah Johnson')).toHaveCount(0);

    await page.getByRole('button', { name: /^Ended/ }).click();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();

    // Her detail page is the unambiguous check: an expired lease used to render the green
    // "Active" pill, because status came from the overdue/expiring lists rather than the
    // dates. End lease is the control that goes with it — there is nothing left to end.
    await page.goto('/renters/1');
    await expect(page.getByText(/Lease ended/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^End lease/ })).toHaveCount(0);

    // Extend deliberately survives expiry, and this used to assert the opposite. A lease
    // that simply ran its term is the canonical thing you renew, and the tenant routinely
    // stays on while the paperwork catches up. Only a *terminated* tenancy loses Extend —
    // there the owner has declared it over, so Reopen has to come first (RenterDetailHero).
    await expect(page.getByRole('button', { name: 'Extend lease' })).toBeVisible();
  });

  // Search crosses the tabs on purpose: "where did this tenant go" must not depend on
  // which filter happens to be open.
  test('search finds an ended renter from the default tab', async ({ page }) => {
    await page.goto('/renters');
    await page.getByPlaceholder(/Search renters/i).fill('Sarah');
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Michael Chen')).toHaveCount(0);
  });

  test('ending a lease moves the renter to Ended, and undo brings it back', async ({ page }) => {
    await page.goto('/renters/2');
    // The trigger carries an ellipsis ("End lease…"); the dialog's confirm does not. Both
    // are also substrings of "Extend lease", hence the exact matches.
    await page.getByRole('button', { name: 'End lease…', exact: true }).click();
    await page.getByRole('button', { name: 'End lease', exact: true }).click();

    await expectToast(page, 'Lease ended');
    // Extend disappears; the banner and its undo take over.
    await expect(page.getByRole('button', { name: 'Extend lease' })).toHaveCount(0);
    await expect(page.getByText(/Lease terminated/)).toBeVisible();

    await page.getByRole('button', { name: 'Reopen lease' }).click();
    await expectToast(page, 'Lease reopened');
    await expect(page.getByRole('button', { name: 'Extend lease' })).toBeVisible();
  });

  // A term is whole years plus an optional remainder, and the remainder becomes one short
  // period at the end of its block. Renter #2 (Michael Chen) is a 2-contract-year lease
  // from 2025-07-22, so adding 4 months moves its end from Jul 2027 to Nov 2027.
  test('a months remainder adds one short period and moves the lease end', async ({ page }) => {
    await page.goto('/renters/2');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    const extraMonths = page.getByRole('group', { name: 'Extra months' }).first();
    for (let i = 0; i < 4; i += 1) {
      await extraMonths.getByRole('button', { name: 'Increase' }).click();
    }

    // The tail is labelled as the months it actually covers — "27-28" would simply be
    // false for a four-month period — and the end date is the sum of the periods
    // (Jul 2025 + 12 + 12 + 4), not the year arithmetic's Jul 2027.
    await expect(page.getByText('Jul–Oct 27')).toBeVisible();
    await expect(page.getByText(/Lease ends:/)).toContainText('Nov 22, 2027');

    await page.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Renter updated');

    // …and re-opening restores the steppers as 2 years + 4 months, rather than counting
    // the tail as a third whole year.
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByRole('group', { name: 'Extra months' }).first(),
    ).toContainText('4');
  });

  // Regression for M1: step-1 required fields are validated on "Next", so the errors
  // show immediately on step 1 instead of being hidden behind step 2.
  test('Next validates step-1 required fields inline (M1)', async ({ page }) => {
    await page.goto('/renters');
    await page.getByRole('button', { name: 'Add renter' }).click();
    // "Add renter" opens a chooser (Enter manually / Scan a lease) — pick manual entry.
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();
    await expect(page.getByRole('heading', { name: 'Add Renter' })).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();

    // Stayed on step 1 (First Name still visible, no step-2 Save), with required errors shown.
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(page.getByText(/required/i).first()).toBeVisible();
    await expect(page.getByText('Renter created')).toHaveCount(0);
  });

  // Regression: opening the edit drawer for a renter with a connected property must show
  // that property pre-selected. A Radix Select fires a spurious onValueChange('') for one
  // render as the reset()-seeded value transitions, which used to wipe the selection and
  // leave the field empty. Renter #6 (Robert Thompson) is linked to property #4.
  test('edit drawer pre-fills the connected property', async ({ page }) => {
    await page.goto('/renters/6');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(
      page.getByRole('combobox').filter({ hasText: '321 Pine Road' })
    ).toBeVisible();
  });

  // Regression: the payment-type select must use the renter domain (cash|wire_transfer|bit),
  // not the transaction method domain. Renter #1 (Sarah Johnson) has payment_type
  // 'wire_transfer', which renders as "Bank transfer".
  test('edit drawer pre-fills the payment type', async ({ page }) => {
    await page.goto('/renters/1');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByRole('combobox').filter({ hasText: 'Bank transfer' })
    ).toBeVisible();
  });

  // Regression: extra contacts must round-trip (they were being stripped before the
  // PATCH/POST by the renter payload sanitizer).
  test('saves and shows an extra contact', async ({ page }) => {
    await page.goto('/renters/3');
    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.getByPlaceholder('Name').fill('Dana Cohen');
    await page.getByPlaceholder('Phone').fill('050-1234567');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Renter updated');
    await expect(page.getByText('Dana Cohen')).toBeVisible();
  });

  // Regression for H2: name + phone is enough to create a renter (optional Controller
  // fields no longer block submission, and the payment-day wheel is truly optional).
  test('can create a renter (round-trip)', async ({ page }) => {
    await page.goto('/renters');
    await page.getByRole('button', { name: 'Add renter' }).click();
    await page.getByRole('menuitem', { name: 'Enter manually' }).click();

    await page.getByLabel('First Name').fill('Tessa');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Phone').fill('512-555-9999');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Renter created');
    await expect(page.getByText('Tessa Tester')).toBeVisible();
  });

  // A CPI-linked year that hasn't started has no published index yet, so its stored amount
  // is only a projection off the latest known reading. The timeline must say so — but only
  // for the future years: the ones already underway resolved against their own index and
  // are frozen server-side. Renter #7 (Noa Levi) is a 4-year `cpi` lease from 2024-09-01.
  test('lease timeline marks only future CPI years as projections', async ({ page }) => {
    await page.goto('/renters/7');

    const timeline = page.getByText('Lease timeline').locator('..').locator('..');
    // Settled years — the one that ended and the one underway — carry no marker.
    await expect(timeline.getByText('24,000', { exact: false })).not.toContainText('≈');
    await expect(timeline.getByText('24,600', { exact: false })).not.toContainText('≈');
    // Both future years are marked with the ≈ and a CPI pill.
    await expect(timeline.getByText('25,080', { exact: false })).toHaveCount(2);
    for (const amount of await timeline.getByText('25,080', { exact: false }).all()) {
      await expect(amount).toContainText('≈');
    }
    await expect(timeline.getByText('CPI', { exact: true })).toHaveCount(2);
    // …and the explanation appears once.
    await expect(
      page.getByText('are projections based on the latest published index', { exact: false })
    ).toBeVisible();
  });

  // The same rule under `custom` per-year rules: only the years carrying a CPI rule (and
  // still in the future) are projections — the percent year before them is exact.
  // Renter #8 (Daniel Katz): year 2 is percent, years 3-4 are CPI and not yet started.
  test('lease timeline leaves non-CPI years in a custom schedule unmarked', async ({ page }) => {
    await page.goto('/renters/8');

    const timeline = page.getByText('Lease timeline').locator('..').locator('..');
    // The percent year is exact even though CPI years follow it.
    await expect(timeline.getByText('31,500', { exact: false })).not.toContainText('≈');
    await expect(timeline.getByText('CPI', { exact: true })).toHaveCount(2);
  });

  // Regression: the marker must come from the year's own rule, not from
  // `rent_escalation_mode` — which is nullable, and absent on renters saved before the
  // structured fields existed. Renter #9 (Yael Bar) has a CPI rule on its last option year
  // and no mode at all; gating on the mode made that year render as a settled figure.
  test('lease timeline marks a CPI year when the escalation mode is missing', async ({ page }) => {
    await page.goto('/renters/9');

    const timeline = page.getByText('Lease timeline').locator('..').locator('..');
    await expect(timeline.getByText('41,000', { exact: false })).toContainText('≈');
    await expect(timeline.getByText('CPI', { exact: true })).toHaveCount(1);
    // The two flat years before it are untouched.
    await expect(timeline.getByText('40,000', { exact: false }).first()).not.toContainText('≈');
  });

  // A lease with no index linkage must render exactly as before — no marker, no footnote.
  test('lease timeline shows no projection note for a non-CPI lease', async ({ page }) => {
    await page.goto('/renters/1');
    await expect(page.getByText('Lease timeline')).toBeVisible();
    await expect(page.getByText('≈', { exact: false })).toHaveCount(0);
    await expect(
      page.getByText('are projections based on the latest published index', { exact: false })
    ).toHaveCount(0);
  });
});
