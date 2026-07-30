import { test, expect } from './fixtures';

// Runs against the mock agent (VITE_USE_MOCK_API): the mock streams a canned answer that
// cites renter 1, so the Sources chip and thread history are exercised without a backend.

test.describe('portfolio chat agent', () => {
  test('opens, streams an answer with a tappable source, and reopens from history', async ({
    page,
  }) => {
    await page.goto('/');

    // Launcher shows only when the agent is enabled (mock /agent/status → enabled).
    await page.getByRole('button', { name: 'Ask Rent Control' }).first().click();
    await expect(page.getByRole('heading', { name: 'Ask Rent Control' })).toBeVisible();

    await page.getByRole('textbox', { name: /Ask about your/ }).fill('When does the lease end?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    // Streamed answer finishes with a Sources chip (the mock cites renter 1).
    await expect(page.getByText('Sources')).toBeVisible({ timeout: 20_000 });
    const chip = page.getByRole('button', { name: 'חוזה השוכר' });
    await expect(chip).toBeVisible();

    // Tapping the chip navigates to that renter and closes the panel — a deliberate jump.
    await chip.click();
    await expect(page).toHaveURL(/\/renters\/1$/);
    await expect(page.getByRole('heading', { name: 'Ask Rent Control' })).toBeHidden();

    // Reopen → history → the thread is listed and reopens with its messages.
    await page.getByRole('button', { name: 'Ask Rent Control' }).first().click();
    await page.getByRole('button', { name: 'Conversations' }).click();
    await page.getByRole('button', { name: /When does the lease end/ }).click();
    await expect(page.getByText('When does the lease end?')).toBeVisible();
  });

  test('deletes a conversation from history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ask Rent Control' }).first().click();
    await page.getByRole('textbox', { name: /Ask about your/ }).fill('When does the lease end?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('Sources')).toBeVisible({ timeout: 20_000 });

    // Open history — the thread is listed.
    await page.getByRole('button', { name: 'Conversations' }).click();
    const thread = page.getByRole('button', { name: /When does the lease end/ });
    await expect(thread).toBeVisible();

    // Accept the confirm() and delete it. Deleting the open thread returns to a new chat
    // (the panel switches back to the conversation view), so the thread disappears...
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete conversation' }).click();
    await expect(thread).toBeHidden();

    // ...and reopening history now shows it's empty.
    await page.getByRole('button', { name: 'Conversations' }).click();
    await expect(page.getByText('No conversations yet.')).toBeVisible();
  });

  test('renders a Markdown table and bold, not raw pipes', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Ask Rent Control' }).first().click();
    await page.getByRole('textbox', { name: /Ask about your/ }).fill('list all my properties in a table');
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    // The answer renders as a real HTML table with the expected cells — not raw Markdown.
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 20_000 });
    await expect(table.getByRole('cell', { name: 'HaPalmach 12' })).toBeVisible();
    await expect(table.getByRole('cell', { name: '₪12,000' })).toBeVisible();

    // Bold rendered as <strong>, and the raw table pipes/separator are gone.
    await expect(page.locator('strong', { hasText: 'properties' })).toBeVisible();
    await expect(page.getByText('| Property |')).toHaveCount(0);
    await expect(page.getByText('| --- |')).toHaveCount(0);
  });

  test('renders right-to-left in Hebrew', async ({ page }) => {
    // Override the fixture's EN pin — this init script runs after it, so HE wins.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('app_language', 'he');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.getByRole('button', { name: 'שאלו את Rent Control' }).first().click();
    await expect(page.getByRole('heading', { name: 'שאלו את Rent Control' })).toBeVisible();

    await page.getByRole('textbox', { name: /שאלו על/ }).fill('מתי מסתיים החוזה?');
    await page.getByRole('button', { name: 'שליחה', exact: true }).click();

    await expect(page.getByText('מקורות')).toBeVisible({ timeout: 20_000 });
  });
});
