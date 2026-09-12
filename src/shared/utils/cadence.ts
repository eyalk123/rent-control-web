import type { TFunction } from 'i18next';

import { isNonMonthlyCadence, paymentFrequencyLabel, type Renter } from '@/shared/types';

/**
 * The qualifier that belongs next to a headline rent when the lease is not actually
 * collected monthly — "billed quarterly".
 *
 * Rent is stored and compared as a monthly figure, which is the right normalisation: it is
 * what the lease states and what makes two tenancies comparable. But presenting it with no
 * qualifier told a landlord with a quarterly tenant that they collect every month, which is
 * simply not what happens.
 *
 * Null for a monthly or unset cadence, where the monthly figure already *is* the payment and
 * a qualifier would be noise on every row in the product.
 */
export function billedCadenceLabel(renter: Renter, t: TFunction): string | null {
  if (!isNonMonthlyCadence(renter.number_of_payments)) return null;
  const n = renter.number_of_payments as number;
  if (n === 4) return t('renter.billedQuarterly');
  if (n === 1) return t('renter.billedYearly');
  return t('renter.billedOther', { count: n });
}

/**
 * The cadence as a bare noun — "Quarterly" — for a badge or a label cell.
 * Null on a monthly or unset lease, same reasoning as above.
 */
export function cadenceBadgeLabel(renter: Renter, t: TFunction): string | null {
  if (!isNonMonthlyCadence(renter.number_of_payments)) return null;
  const label = paymentFrequencyLabel(renter.number_of_payments);
  return label ? t(label.key, { count: label.count }) : null;
}
