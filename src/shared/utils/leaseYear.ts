import { addMonths, periodMonths, type LeaseYear } from '@/shared/types';

/**
 * Where each lease period sits on the calendar.
 *
 * These used to derive everything from the index alone — period `i` began on the i-th
 * anniversary and ran a year. That only holds while every period is twelve months, so
 * they now walk the periods' own lengths. For an all-whole-years lease the results are
 * identical, which is why the change is invisible to existing leases.
 */

function parseStart(leaseStart: string | null | undefined): Date | null {
  if (!leaseStart) return null;
  const start = new Date(leaseStart);
  return isNaN(start.getTime()) ? null : start;
}

function monthsBefore(rows: LeaseYear[] | undefined, index: number): number {
  return (rows ?? []).slice(0, index).reduce((sum, y) => sum + periodMonths(y), 0);
}

/** Start date of period `index`, 0-based. Null when the lease has no usable start date. */
export function leaseYearStart(
  leaseStart: string | null | undefined,
  rows: LeaseYear[] | undefined,
  index: number,
): Date | null {
  const start = parseStart(leaseStart);
  if (!start) return null;
  return addMonths(start, monthsBefore(rows, index));
}

/** End date of period `index` — i.e. the start of the one after it. */
export function leaseYearEnd(
  leaseStart: string | null | undefined,
  rows: LeaseYear[] | undefined,
  index: number,
): Date | null {
  const start = parseStart(leaseStart);
  if (!start) return null;
  return addMonths(start, monthsBefore(rows, index) + periodMonths((rows ?? [])[index] ?? {} as LeaseYear));
}

/**
 * Short label for a period.
 *
 * A full year keeps the familiar `26-27`. A shorter period gets a month range instead —
 * `26-27` on a four-month period would simply be false, and the timeline cell has to be
 * readable on its own.
 */
export function getLeaseYearLabel(
  leaseStart: string | null | undefined,
  rows: LeaseYear[] | undefined,
  index: number,
  locale?: string,
): string {
  const start = leaseYearStart(leaseStart, rows, index);
  const end = leaseYearEnd(leaseStart, rows, index);
  if (!start || !end) {
    // No usable start date: fall back to the old index-derived label so a half-entered
    // form still shows something stable while the user is typing.
    const base = new Date().getFullYear();
    const yy = (n: number) => String(n % 100).padStart(2, '0');
    return `${yy(base + index)}-${yy(base + index + 1)}`;
  }

  const yy = (d: Date) => String(d.getFullYear() % 100).padStart(2, '0');
  if (periodMonths((rows ?? [])[index] ?? ({} as LeaseYear)) >= 12) {
    return `${yy(start)}-${yy(end)}`;
  }

  const month = new Intl.DateTimeFormat(locale, { month: 'short' });
  // The end date is the *next* period's start, so the last month actually covered is the
  // one before it.
  const lastMonth = addMonths(end, -1);
  const from = month.format(start);
  const to = month.format(lastMonth);
  return from === to ? `${from} ${yy(start)}` : `${from}–${to} ${yy(lastMonth)}`;
}

export function isCurrentLeaseYear(
  leaseStart: string | null | undefined,
  rows: LeaseYear[] | undefined,
  index: number,
): boolean {
  const start = leaseYearStart(leaseStart, rows, index);
  const end = leaseYearEnd(leaseStart, rows, index);
  if (!start || !end) return false;
  const today = new Date();
  return today >= start && today < end;
}
