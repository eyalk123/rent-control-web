// Splitting a single joint lease rent across co-tenants. When a lease states one joint
// monthly rent for all tenants together (rent_is_joint), the scan summary lets the user
// divide it — equally or with custom per-renter amounts — into each renter's own base_rent.
import type { RenterFormValues } from '@/features/renters/validation/renterValidation';
import type { MappedRenter } from './mapExtraction';

/** Round to 2 decimals (rent is usually integer, but custom splits may not divide evenly). */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Split `total` into `n` equal shares; the rounding remainder goes to the last renter so
 *  the shares always sum back to exactly `total`. */
export function equalShares(total: number, n: number): number[] {
  if (n <= 0) return [];
  const each = round2(total / n);
  const shares = Array(n).fill(each);
  shares[n - 1] = round2(total - each * (n - 1));
  return shares;
}

/** Whether the custom per-renter amounts add up to the joint total (within a cent). */
export function sharesSumToTotal(shares: number[], total: number): boolean {
  const sum = shares.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return Math.abs(sum - total) < 0.01;
}

/** Return a copy of `renters` with each renter's `baseRent` set to its share of the joint
 *  rent. Money-valued term amounts (a fixed-money escalation and any custom per-year lease
 *  amounts) scale by the same ratio; percentages, term length, insurance and payment day are
 *  left unchanged (they're shared across the tenants). */
export function applyJointRentSplit(
  renters: MappedRenter[],
  total: number,
  shares: number[],
): MappedRenter[] {
  return renters.map((r, i) => {
    const share = shares[i] ?? 0;
    const ratio = total > 0 ? share / total : renters.length ? 1 / renters.length : 0;
    const prefill: Partial<RenterFormValues> = { ...r.prefill, baseRent: String(share) };

    // Scale a fixed-money escalation step by the same ratio (percentages stay as-is).
    if (prefill.escalationMode === 'fixed' && prefill.escalationValue) {
      const v = Number(prefill.escalationValue);
      if (Number.isFinite(v)) prefill.escalationValue = String(round2(v * ratio));
    }
    // Scale each custom per-year amount by the ratio.
    if (prefill.leaseYears && prefill.leaseYears.length) {
      prefill.leaseYears = prefill.leaseYears.map((ly) => {
        const v = Number(ly.amount);
        return Number.isFinite(v) && ly.amount !== '' ? { ...ly, amount: String(round2(v * ratio)) } : ly;
      });
    }
    return { ...r, prefill };
  });
}
