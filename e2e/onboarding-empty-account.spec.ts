import { test, expect, dismissTours, enableTours, waitForAppReady } from './fixtures';

/**
 * The tours on an account that has nothing in it yet.
 *
 * This is the case the tours are written for and the one they used to miss entirely. Every
 * list tour was gated on its screen already having rows — `hasProperties` on Properties,
 * `hasRenters` on Renters — so the person who had just signed up, who is the only person
 * who needs to be told how a property gets in, was the only person the tour never opened
 * for. The gates are `always` now, and the individual steps that genuinely need content to
 * point at drop themselves through `skipWhen`.
 *
 * Every other spec in the suite runs against the populated fixtures, so these assertions
 * cannot be folded into `onboarding.spec.ts`: the empty state is armed at module load (see
 * `EMPTY_ACCOUNT_MOCK_KEY`), which means it has to be set before the app's first script and
 * therefore belongs to a file of its own.
 */
async function emptyAccount(page: Parameters<typeof waitForAppReady>[0]) {
  await enableTours(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mock.emptyAccount', '1');
    } catch {
      /* ignore */
    }
  });
}

test.describe('onboarding — an account with no data', () => {
  test('first-run still runs, and closes on the one instruction written for an empty account', async ({
    page,
  }) => {
    await emptyAccount(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Welcome to RentVance')).toBeVisible();

    // Walk to the end rather than counting: optional steps drop themselves, so the number
    // of cards is not fixed and asserting on it would be asserting on the fixtures.
    for (let i = 0; i < 20; i++) {
      const next = card.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }
    await expect(card.getByText('Start with one property')).toBeVisible();
  });

  test('the home sweep does not pile onto that call to action', async ({ page }) => {
    await emptyAccount(page);
    await page.goto('/home');
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Welcome to RentVance')).toBeVisible();
    await card.getByRole('button', { name: 'Skip' }).click();

    // Home's own tour is gated on `hasProperties` for exactly this reason: first-run ends
    // by asking for a first property, and seven more cards on top of that would bury it.
    await expect(card).toHaveCount(0);
  });

  test('the properties tour runs on an empty list, and keeps the step about adding one', async ({
    page,
  }) => {
    await emptyAccount(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await dismissTours(page);

    await page.getByRole('link', { name: 'Properties' }).first().click();
    await expect(page).toHaveURL(/\/properties/);
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Your properties')).toBeVisible();

    const titles: string[] = [];
    for (let i = 0; i < 20; i++) {
      titles.push((await card.getByRole('heading').first().textContent()) ?? '');
      const next = card.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }

    // The point of the whole change: the two ways a property gets in are explained to the
    // person who has not added one.
    expect(titles).toContain('Two ways in');
    // And the step pointing at the first card is not, because there is no first card.
    expect(titles).not.toContain('Cards');
  });

  test('the renters tour runs on an empty list too', async ({ page }) => {
    await emptyAccount(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await dismissTours(page);

    await page.getByRole('link', { name: 'Renters' }).first().click();
    await expect(page).toHaveURL(/\/renters/);
    await waitForAppReady(page);

    await expect(page.getByRole('dialog').getByText('Your renters')).toBeVisible();
  });

  test('the transactions tour runs on an empty ledger, without the step that needs rows', async ({
    page,
  }) => {
    await emptyAccount(page);
    await page.goto('/home');
    await waitForAppReady(page);
    await dismissTours(page);

    await page.getByRole('link', { name: 'Transactions' }).first().click();
    await expect(page).toHaveURL(/\/transactions/);
    await waitForAppReady(page);

    const card = page.getByRole('dialog');
    await expect(card.getByText('Every payment, in one place')).toBeVisible();
    // The seed moved onto this opener when `twoKinds` became droppable, so that "nothing
    // is charged automatically" still reaches the account most likely to assume otherwise.
    await expect(card.getByText(/nothing is charged automatically/i)).toBeVisible();

    const titles: string[] = [];
    for (let i = 0; i < 20; i++) {
      titles.push((await card.getByRole('heading').first().textContent()) ?? '');
      const next = card.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }

    expect(titles).toContain('Recording rent');
    // Its anchor is the first month's rows, which do not exist yet.
    expect(titles).not.toContain('Two kinds of money');
  });
});
