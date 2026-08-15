import type { Transaction } from '@/shared/types';
import { fmtDate, fmtMonthYear } from '@/shared/utils/dates';

/**
 * The date a transaction belongs to for the user: the month rent was paid *for*
 * when there is one (revenue), otherwise the day the money moved (expenses).
 *
 * This is the rule the lists sort and group by, and it must stay in step with
 * `EFFECTIVE_DATE` in the backend's `transaction_repository.py` — the server
 * paginates in this order, so a mismatch scrambles the list on scroll.
 */
export function effectiveDate(tx: Pick<Transaction, 'month_for' | 'date_of_payment'>): string {
  return tx.month_for ?? tx.date_of_payment;
}

/** `YYYY-MM` bucket key for grouping a list into month sections. */
export function monthKey(tx: Pick<Transaction, 'month_for' | 'date_of_payment'>): string {
  return effectiveDate(tx).slice(0, 7);
}

/**
 * How a transaction's date reads in a list: "Apr 2026" for revenue — `month_for`
 * stores the 1st of the month, so the day carries no meaning — and the full
 * "15 Apr 2026" for expenses, where the payment day is real.
 */
export function fmtTxDate(
  tx: Pick<Transaction, 'type' | 'month_for' | 'date_of_payment'>,
): string {
  return tx.type === 'revenue' && tx.month_for
    ? fmtMonthYear(tx.month_for)
    : fmtDate(tx.date_of_payment);
}
