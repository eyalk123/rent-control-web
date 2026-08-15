export function getLeaseYearLabel(leaseStart: string | null | undefined, index: number): string {
  const baseYear = leaseStart ? new Date(leaseStart).getFullYear() : new Date().getFullYear();
  const startYY = (baseYear + index) % 100;
  const endYY = (baseYear + index + 1) % 100;
  return `${String(startYY).padStart(2, '0')}-${String(endYY).padStart(2, '0')}`;
}

/** Start date (anniversary) of lease year `index`, 0-based. Null when the lease has no
 * usable start date. */
export function leaseYearStart(
  leaseStart: string | null | undefined,
  index: number,
): Date | null {
  if (!leaseStart) return null;
  const start = new Date(leaseStart);
  if (isNaN(start.getTime())) return null;
  start.setFullYear(start.getFullYear() + index);
  return start;
}

export function isCurrentLeaseYear(leaseStart: string | null | undefined, index: number): boolean {
  const start = leaseYearStart(leaseStart, index);
  if (!start) return false;
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const today = new Date();
  return today >= start && today < end;
}
