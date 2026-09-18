import { test, expect } from '@playwright/test';
import { buildLeaseYears } from '../src/shared/utils/leaseSchedule';
import type { LeaseYear } from '../src/shared/types';

/**
 * Correcting one year's rent, without rebuilding the lease as Custom.
 *
 * A whole-lease rule prices every year off the base (`base * (1 + r) ** i`), which cannot
 * express "…and then the landlord actually raised it by more than we agreed". The only way
 * to fix a single year used to be switching the lease to Custom — turning "correct a number"
 * into "design a schedule". A typed amount now carries `rule: { mode: 'manual' }` in any
 * mode, and the years after it chain forward from it.
 *
 * These run in Node — nothing here touches `page`, so no browser is launched — which is why
 * they sit beside `onboarding-registry.spec.ts` rather than in a unit-test layer this app
 * does not otherwise have.
 */

const BASE = {
  contractYears: 4,
  contractMonths: 0,
  optionYears: 0,
  optionMonths: 0,
  baseRent: 5000,
  escalationValue: 10,
};

const pin = (amount: number): LeaseYear => ({
  amount,
  type: 'contract',
  rule: { mode: 'manual' },
});

const plain = (amount: number): LeaseYear => ({ amount, type: 'contract' });

test.describe('lease schedule, hand-corrected years', () => {
  test('an untouched percent lease still takes the formula path', () => {
    // The regression that matters most: every existing lease must come out byte-identical.
    const out = buildLeaseYears({ ...BASE, escalationMode: 'percent' });
    expect(out.map((y) => y.amount)).toEqual([5000, 5500, 6050, 6655]);
    expect(out.every((y) => y.rule === undefined)).toBe(true);
  });

  test('a corrected year survives re-materialisation', () => {
    const existing = [plain(5000), pin(6000), plain(6050), plain(6655)];
    const out = buildLeaseYears({ ...BASE, escalationMode: 'percent' }, existing);

    // The pin holds...
    expect(out[1].amount).toBe(6000);
    // ...and everything after it continues from the corrected figure, not from the base.
    expect(out.map((y) => y.amount)).toEqual([5000, 6000, 6600, 7260]);
  });

  test('only the pin is carried into the payload, not a synthesised rule', () => {
    const out = buildLeaseYears(
      { ...BASE, escalationMode: 'percent' },
      [plain(5000), pin(6000), plain(6050), plain(6655)],
    );
    // A whole-lease rule is not a per-year rule. Writing one onto every row would make an
    // ordinary percent lease reopen as though it had been hand-built.
    expect(out.map((y) => y.rule?.mode)).toEqual([undefined, 'manual', undefined, undefined]);
  });

  test('fixed mode chains from the pin too', () => {
    const out = buildLeaseYears(
      { ...BASE, escalationMode: 'fixed', escalationValue: 250 },
      [plain(5000), pin(6000), plain(5500), plain(5750)],
    );
    expect(out.map((y) => y.amount)).toEqual([5000, 6000, 6250, 6500]);
  });

  test('a pin under `none` holds every later year at the corrected amount', () => {
    const out = buildLeaseYears(
      { ...BASE, escalationMode: 'none' },
      [plain(5000), pin(6000), plain(5000), plain(5000)],
    );
    expect(out.map((y) => y.amount)).toEqual([5000, 6000, 6000, 6000]);
  });

  test('a short tail holds its rent rather than stepping, pinned or not', () => {
    // Same rule the formula path has always had: a three-month tail is an alignment stub,
    // not a repricing event, so it must not quietly take another escalation step.
    const out = buildLeaseYears(
      { ...BASE, contractYears: 2, contractMonths: 3, escalationMode: 'percent' },
      [plain(5000), pin(6000), plain(6050)],
    );
    expect(out.map((y) => y.amount)).toEqual([5000, 6000, 6000]);
    expect(out[2].months).toBe(3);
  });

  test('custom mode is unaffected', () => {
    // Custom has always preserved amounts; the new path must not intercept it.
    const existing = [plain(5000), pin(6000), plain(7000), plain(8000)];
    const out = buildLeaseYears({ ...BASE, escalationMode: 'custom' }, existing);
    expect(out.map((y) => y.amount)).toEqual([5000, 6000, 7000, 8000]);
  });
});
