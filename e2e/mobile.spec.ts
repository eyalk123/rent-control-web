import { test, expect, expectNoRouteError, waitForAppReady } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Mobile regression suite — runs only under the `mobile` project (iPhone 14, 390x844).
 *
 * These assertions encode the concrete defects found in the mobile audit, so they
 * fail loudly if any of them come back. Each one names the thing it protects.
 */

/** Every protected route, including the tab sub-states that render different layouts. */
const ROUTES = [
  '/home',
  '/properties',
  '/properties/1',
  '/properties/1?tab=renters',
  '/properties/1?tab=transactions',
  '/properties/1?tab=documents',
  '/renters',
  '/renters/1',
  '/transactions',
  '/transactions/1',
  '/suppliers',
  '/reports',
  '/reports/income-expense',
  '/reports/expense-log',
  '/settings',
  '/settings/notifications',
];

/** Widest element in the layout vs. the viewport. Guards the inline-grid-template class of bugs. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
}

/**
 * Narrowest column of any visible multi-column grid. The audit found templates that
 * resolved to 18-20px because an inline `gridTemplateColumns` cannot be overridden by
 * a media query, which made whole panels unreadable.
 *
 * Grids marked `data-dense-grid` are skipped: a calendar-style grid of small cells is the
 * intended design there, not a collapsed panel. Those still owe a usable touch target, so
 * mark one only when its cells stay at or above 44px.
 */
async function narrowestGridColumn(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    let min = Infinity;
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.hasAttribute('data-dense-grid')) continue;
      if (!visible(el) || !getComputedStyle(el).display.includes('grid')) continue;
      const cols = getComputedStyle(el)
        .gridTemplateColumns.split(' ')
        .map(parseFloat)
        .filter((n) => !isNaN(n));
      if (cols.length > 1) min = Math.min(min, ...cols);
    }
    return min === Infinity ? null : Math.round(min);
  });
}

test.describe('mobile — layout integrity at 390px', () => {
  for (const route of ROUTES) {
    test(`${route} has no horizontal overflow and no crushed columns`, async ({ page, pageErrors }) => {
      await page.goto(route);
      await waitForAppReady(page);
      await expectNoRouteError(page);

      const { doc, viewport } = await horizontalOverflow(page);
      expect(doc, `${route} overflows the viewport horizontally`).toBeLessThanOrEqual(viewport);

      const narrowest = await narrowestGridColumn(page);
      if (narrowest !== null) {
        expect(narrowest, `${route} has a grid column collapsed to ${narrowest}px`).toBeGreaterThan(80);
      }

      expect(pageErrors, `${route} raised uncaught errors`).toEqual([]);
    });
  }
});

test.describe('mobile — navigation', () => {
  test('the Home tab is tappable and not covered by the accessibility button', async ({ page }) => {
    await page.goto('/home');
    await waitForAppReady(page);

    // The FAB used to sit at z-50 directly on top of the Home tab, so a tap at the
    // tab's centre hit the FAB instead. Hit-test the centre point.
    const hit = await page.evaluate(() => {
      const nav = Array.from(document.querySelectorAll('body *')).find(
        (el) => getComputedStyle(el).position === 'fixed' && el.querySelectorAll('a').length >= 4,
      );
      const home = nav?.querySelector('a');
      if (!home) return null;
      const r = home.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return el?.closest('a')?.getAttribute('href') ?? null;
    });
    expect(hit, 'the Home tab centre is covered by another element').toBe('/home');
  });

  test('Reports and Suppliers are reachable from the bottom bar', async ({ page }) => {
    // Both used to have no mobile navigation path at all.
    await page.goto('/home');
    await waitForAppReady(page);

    await page.getByRole('button', { name: 'More', exact: true }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Suppliers' })).toBeVisible();

    await sheet.getByRole('link', { name: 'Suppliers' }).click();
    await expect(page).toHaveURL(/\/suppliers$/);
    // Navigating dismisses the sheet.
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the search trigger fits inside the top bar', async ({ page }) => {
    await page.goto('/home');
    await waitForAppReady(page);

    // The full placeholder wrapped to three lines and spilled out of a 36px-tall button.
    const overflow = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.getBoundingClientRect().top < 70 && b.getBoundingClientRect().width > 100,
      );
      return btn ? { scroll: btn.scrollHeight, client: btn.clientHeight } : null;
    });
    expect(overflow).not.toBeNull();
    expect(overflow!.scroll, 'the search trigger label overflows its button').toBeLessThanOrEqual(
      overflow!.client + 1,
    );
  });
});

test.describe('mobile — drawers', () => {
  test('the form drawer footer is not covered by the accessibility button', async ({ page }) => {
    // The FAB overlapped the pinned footer, clipping "Cancel" to "…cel".
    await page.goto('/properties?new=true');
    await waitForAppReady(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeVisible();

    // Measure and hit-test inside one evaluate, and poll it: the drawer slides in, so a
    // box read in one call and probed in the next can be stale by the time it is used.
    // Polling still fails if the FAB genuinely covers the button — that never settles.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(
              (b) => b.textContent?.trim() === 'Cancel',
            );
            if (!btn) return null;
            const r = btn.getBoundingClientRect();
            const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return el?.closest('button')?.textContent?.trim() ?? null;
          }),
        { message: 'the drawer Cancel button is covered' },
      )
      .toBe('Cancel');
  });
});

test.describe('mobile — typography', () => {
  test('no visible text renders below 11px', async ({ page }) => {
    await page.goto('/reports/income-expense');
    await waitForAppReady(page);

    const smallest = await page.evaluate(() => {
      const visible = (el: Element) => {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const sizes = Array.from(document.querySelectorAll('body *'))
        .filter((el) => visible(el) && el.children.length === 0 && (el.textContent ?? '').trim().length > 1)
        .map((el) => parseFloat(getComputedStyle(el).fontSize));
      return sizes.length ? Math.min(...sizes) : null;
    });
    expect(smallest, 'text is rendering below the 11px mobile floor').toBeGreaterThanOrEqual(11);
  });
});
