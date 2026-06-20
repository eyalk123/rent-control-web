export function getLeaseYearLabel(leaseStart: string | null | undefined, index: number): string {
  const baseYear = leaseStart ? new Date(leaseStart).getFullYear() : new Date().getFullYear();
  const startYY = (baseYear + index) % 100;
  const endYY = (baseYear + index + 1) % 100;
  return `${String(startYY).padStart(2, '0')}-${String(endYY).padStart(2, '0')}`;
}

export function isCurrentLeaseYear(leaseStart: string | null | undefined, index: number): boolean {
  if (!leaseStart) return false;
  const start = new Date(leaseStart);
  if (isNaN(start.getTime())) return false;
  start.setFullYear(start.getFullYear() + index);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const today = new Date();
  return today >= start && today < end;
}
