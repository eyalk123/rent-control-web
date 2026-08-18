import { getRentForMonth, type Renter, type Transaction } from '@/shared/types';
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
  /** Amount owed for this month's instalment. 0 when nothing is owed. */
  expected: number;
  /** Sum of revenue recorded against this month. */
  paidSum: number;
  transactions: Transaction[];
  /** Paid, but the earliest payment landed after the due day. */
  isLate: boolean;
  /** Paid, but the total differs from the expected instalment. */
  hasAmountMismatch: boolean;
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

function monthsBetween(from: Date, year: number, monthIndex: number): number {
  return (year - from.getFullYear()) * 12 + (monthIndex - from.getMonth());
}

function parseLeaseStart(renter: Renter): Date | null {
  if (!renter.lease_start) return null;
  const d = new Date(renter.lease_start);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * End of the lease *schedule* — start plus one year per lease year, option years included.
 *
 * Deliberately not `getLeaseEndDate`, which counts only `contract` years because it drives
 * the expiry warning. Using that here would blank out the option years on the grid, and an
 * option year that has been taken up is a year rent is owed for.
 */
export function getLeaseScheduleEnd(renter: Renter): Date | null {
  const start = parseLeaseStart(renter);
  if (!start || !renter.lease_years?.length) return null;
  return new Date(start.getFullYear() + renter.lease_years.length, start.getMonth(), start.getDate());
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

    // Off-months of a quarterly/yearly cycle owe nothing.
    if (leaseStart && interval > 1 && monthsElapsed % interval !== 0) {
      return paidSum > 0
        ? { ...base, status: 'paid', expected: 0 }
        : { ...base, status: 'not-due', expected: 0 };
    }

    const expected = getRentForMonth(renter, monthKey) * interval;

    // Clamp to the month's length so a pay-day of 31 still resolves in February.
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dueDate = new Date(year, monthIndex, Math.min(payDay, lastDayOfMonth));

    if (paidSum > 0) {
      const earliestPayment = txs
        .map((tx) => new Date(tx.date_of_payment))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return {
        ...base,
        status: 'paid',
        expected,
        dueDate,
        isLate: earliestPayment != null && earliestPayment > dueDate,
        // Sub-shekel drift is rounding, not a shortfall.
        hasAmountMismatch: expected > 0 && Math.abs(paidSum - expected) >= 1,
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
