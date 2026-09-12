import { getRentForMonth, getScheduleEndDate, type Renter, type Transaction } from '@/shared/types';
import { DEFAULT_PAYMENT_DAY_NUM } from '@/shared/constants/paymentDay';

/**
 * Derives the per-month rent-payment picture for a renter from their lease and their
 * recorded revenue transactions.
 *
 * There is no payment status in the data model: a transaction row *is* a payment, and
 * "paid for month M" means a revenue row exists whose `month_for` falls in M. That is
 * exactly what the backend's overdue check tests, so the grid and the alerts agree.
 *
 * The cadence rules mirror `renter_service._payment_interval_months` /
 * `_is_payment_due_month` — a quarterly lease only owes in the months its cycle lands on,
 * anchored on `lease_start`, and when it does it owes the whole instalment.
 *
 * Keep this in step with the mobile app's copy
 * (`rent-control/src/features/transactions/utils/rentSchedule.ts`).
 */

export type MonthStatus =
  | 'paid'
  | 'overdue'
  | 'due'
  | 'not-due'
  | 'outside-lease'
  | 'future';

export interface MonthCell {
  /** "YYYY-MM" */
  monthKey: string;
  /** 0-11 */
  monthIndex: number;
  status: MonthStatus;
  /**
   * Amount owed for this month's instalment, per the lease **as it stands today**. 0 when
   * nothing is owed.
   *
   * Always the live schedule, including for months already settled. The schedule is the
   * owner's own statement of what the rent is; editing it, even retroactively, is a
   * deliberate act and not something to be second-guessed here.
   */
  expected: number;
  /** Sum of revenue recorded against this month. */
  paidSum: number;
  transactions: Transaction[];
  /** Paid, but the earliest payment landed after the due day. */
  isLate: boolean;
  /**
   * Paid, but not the amount that was being asked for at the time — a real shortfall or
   * overpayment. Something to chase.
   */
  hasAmountMismatch: boolean;
  /**
   * Paid exactly what was asked at the time, but the lease has been edited since and now
   * says something different. Nothing went wrong and nobody owes anything, so this renders
   * as a neutral marker, never the amber warning.
   *
   * Only knowable for payments carrying a snapshot; older rows can't tell this apart from
   * a real shortfall and stay on {@link hasAmountMismatch}.
   */
  leaseChangedSince: boolean;
  /**
   * What the lease quoted for this instalment when it was paid, or null when no payment
   * here recorded one. Explains a disagreement — it never replaces {@link expected}.
   */
  quotedAtPayment: number | null;
  /** The day rent was due, or null when nothing was owed. */
  dueDate: Date | null;
  /** True when pressing the cell should record a payment. */
  isPayable: boolean;
}

/** Months between instalments: 12 payments/yr = 1, quarterly = 3, yearly = 12. */
export function paymentIntervalMonths(numberOfPayments: number | null | undefined): number {
  if (!numberOfPayments || numberOfPayments <= 0) return 1;
  return Math.max(1, Math.round(12 / numberOfPayments));
}

/**
 * Does this renter owe an instalment in `monthKey` — "YYYY-MM", or any longer ISO date
 * whose first seven characters are the month?
 *
 * The cycle is anchored on `lease_start` and counted in whole months, which is exactly what
 * the backend's `_is_payment_due_month` does. The two have to agree: if they drift, the grid
 * and the overdue alert end up disagreeing about the same month.
 *
 * Says nothing about whether the month falls inside the lease at all — callers that care
 * about that check it separately.
 */
export function isPaymentDueMonth(renter: Renter, monthKey: string): boolean {
  const interval = paymentIntervalMonths(renter.number_of_payments);
  // Monthly, or a lease with no start to anchor the cycle on: every month owes.
  if (interval <= 1) return true;
  const leaseStart = parseLeaseStart(renter);
  if (!leaseStart) return true;

  const [year, month] = monthKey.slice(0, 7).split('-').map(Number);
  if (!year || !month) return true;

  const elapsed = monthsBetween(leaseStart, year, month - 1);
  return elapsed >= 0 && elapsed % interval === 0;
}

/**
 * The subset of `monthKeys` this renter actually owes an instalment in, input order kept.
 *
 * What the bulk revenue form narrows a chosen period down to: a quarterly renter picked out
 * of a three-month period owes once, not three times.
 */
export function dueMonthsWithin(renter: Renter, monthKeys: string[]): string[] {
  return monthKeys.filter((monthKey) => isPaymentDueMonth(renter, monthKey));
}

function monthsBetween(from: Date, year: number, monthIndex: number): number {
  return (year - from.getFullYear()) * 12 + (monthIndex - from.getMonth());
}

function parseLeaseStart(renter: Renter): Date | null {
  if (!renter.lease_start) return null;
  const d = new Date(renter.lease_start);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * End of the lease *schedule* — start plus every period's own length, option years included.
 *
 * Deliberately not `getLeaseEndDate`, which counts only `contract` years because it drives
 * the expiry warning. Using that here would blank out the option years on the grid, and an
 * option year that has been taken up is a year rent is owed for.
 *
 * Delegates to `getScheduleEndDate` rather than counting a year per period: a lease can carry
 * a short final period ("18 months", "28 months" — which lease scanning deliberately keeps
 * rather than rounding), and assuming 12 ran the grid past the real end of the lease.
 */
export function getLeaseScheduleEnd(renter: Renter): Date | null {
  return getScheduleEndDate(renter);
}

/**
 * Calendar years the renter can have payments recorded against: from the lease start year
 * up to the earlier of the schedule end and the current year.
 *
 * Capping at the current year is what keeps future lease years off the grid — rent that
 * cannot be owed yet cannot be paid yet.
 */
export function listPayableYears(renter: Renter): number[] {
  const start = parseLeaseStart(renter);
  if (!start) return [];
  const end = getLeaseScheduleEnd(renter);
  const currentYear = new Date().getFullYear();

  const firstYear = start.getFullYear();
  // The schedule ends on the anniversary, so a lease ending in January still owes for that
  // January — the end year itself is included.
  const lastYear = Math.min(end ? end.getFullYear() : currentYear, currentYear);
  if (lastYear < firstYear) return [];

  const years: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) years.push(y);
  return years;
}

/** Union of every renter's payable years, ascending. For the property matrix. */
export function listPayableYearsForRenters(renters: Renter[]): number[] {
  const set = new Set<number>();
  for (const r of renters) for (const y of listPayableYears(r)) set.add(y);
  return [...set].sort((a, b) => a - b);
}

function monthKeyOf(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/** Revenue rows keyed by the month they are *for*, not the month they arrived in. */
function groupRevenueByMonth(transactions: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.type !== 'revenue' || !tx.month_for) continue;
    const key = tx.month_for.slice(0, 7);
    const bucket = map.get(key);
    if (bucket) bucket.push(tx);
    else map.set(key, [tx]);
  }
  return map;
}

/**
 * The instalment the lease was quoting when this month's payments were recorded, or null
 * when none of them carries a snapshot (anything saved before `expected_amount` existed).
 *
 * Several payments against one month should all have been quoted the same figure; if a
 * lease was edited between them they won't be, and the *earliest* is the one the run of
 * payments was started against — taking the latest would let a rent rise reach backwards,
 * which is the whole problem this exists to stop. They are not summed: each row records
 * what one instalment was worth, not a share of it.
 */
function snapshotExpected(txs: Transaction[]): number | null {
  let earliest: Transaction | null = null;
  for (const tx of txs) {
    if (tx.expected_amount == null) continue;
    if (earliest == null || tx.date_of_payment < earliest.date_of_payment) earliest = tx;
  }
  return earliest?.expected_amount ?? null;
}

/** Builds the 12 cells for one renter in one calendar year. */
export function buildRentGrid(
  renter: Renter,
  year: number,
  transactions: Transaction[],
  now: Date = new Date(),
): MonthCell[] {
  const byMonth = groupRevenueByMonth(transactions);
  const leaseStart = parseLeaseStart(renter);
  const leaseEnd = getLeaseScheduleEnd(renter);
  const interval = paymentIntervalMonths(renter.number_of_payments);
  const payDay = renter.payment_day_of_month || DEFAULT_PAYMENT_DAY_NUM;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return Array.from({ length: 12 }, (_, monthIndex): MonthCell => {
    const monthKey = monthKeyOf(year, monthIndex);
    const txs = byMonth.get(monthKey) ?? [];
    const paidSum = txs.reduce((sum, tx) => sum + tx.amount, 0);

    const base = {
      monthKey,
      monthIndex,
      paidSum,
      transactions: txs,
      isLate: false,
      hasAmountMismatch: false,
      leaseChangedSince: false,
      quotedAtPayment: null,
      dueDate: null,
      isPayable: false,
    };

    // Outside the lease term. A payment recorded here (a deposit month, a lease that was
    // shortened) still shows as paid rather than being hidden — the money is real.
    const monthsElapsed = leaseStart ? monthsBetween(leaseStart, year, monthIndex) : 0;
    const beforeStart = leaseStart != null && monthsElapsed < 0;
    const afterEnd =
      leaseEnd != null &&
      (year > leaseEnd.getFullYear() ||
        (year === leaseEnd.getFullYear() && monthIndex >= leaseEnd.getMonth()));

    if (beforeStart || afterEnd) {
      return paidSum > 0
        ? { ...base, status: 'paid', expected: 0 }
        : { ...base, status: 'outside-lease', expected: 0 };
    }

    // Off-months of a quarterly/yearly cycle owe nothing. Routed through the shared
    // predicate so the grid and the bulk revenue form can never disagree about which
    // months a cycle lands on.
    if (!isPaymentDueMonth(renter, monthKey)) {
      return paidSum > 0
        ? { ...base, status: 'paid', expected: 0 }
        : { ...base, status: 'not-due', expected: 0 };
    }

    const expected = getRentForMonth(renter, monthKey) * interval;
    // What the lease was quoting when these payments were recorded. Used only to explain a
    // disagreement, never to replace `expected`. It is what separates "the tenant paid the
    // wrong amount" from "you have since changed the lease" — identical arithmetic, and
    // completely different news. The snapshot is per instalment, so it takes the same
    // multiplier the live figure does.
    const quoted = snapshotExpected(txs);
    const quotedAtPayment = quoted != null ? quoted * interval : null;

    // Clamp to the month's length so a pay-day of 31 still resolves in February.
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dueDate = new Date(year, monthIndex, Math.min(payDay, lastDayOfMonth));

    if (paidSum > 0) {
      const earliestPayment = txs
        .map((tx) => new Date(tx.date_of_payment))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      // Judged against what was actually being asked for at the time, so a month settled
      // correctly is never reported as a shortfall just because the rent has since moved.
      // Sub-shekel drift is rounding, not a shortfall.
      const askedFor = quotedAtPayment ?? expected;
      const paidWhatWasAsked = askedFor > 0 && Math.abs(paidSum - askedFor) < 1;
      return {
        ...base,
        status: 'paid',
        expected,
        quotedAtPayment,
        dueDate,
        isLate: earliestPayment != null && earliestPayment > dueDate,
        hasAmountMismatch: askedFor > 0 && !paidWhatWasAsked,
        leaseChangedSince:
          paidWhatWasAsked &&
          quotedAtPayment != null &&
          Math.abs(quotedAtPayment - expected) >= 1,
      };
    }

    const isFuture = year > currentYear || (year === currentYear && monthIndex > currentMonth);
    if (isFuture) return { ...base, status: 'future', expected, dueDate };

    return {
      ...base,
      status: now > dueDate ? 'overdue' : 'due',
      expected,
      dueDate,
      isPayable: true,
    };
  });
}

export interface RentYearTotals {
  expected: number;
  collected: number;
  outstandingMonths: number;
}

export function summariseRentYear(cells: MonthCell[]): RentYearTotals {
  return cells.reduce<RentYearTotals>(
    (acc, cell) => ({
      expected: acc.expected + cell.expected,
      collected: acc.collected + cell.paidSum,
      outstandingMonths:
        acc.outstandingMonths + (cell.status === 'overdue' || cell.status === 'due' ? 1 : 0),
    }),
    { expected: 0, collected: 0, outstandingMonths: 0 },
  );
}
