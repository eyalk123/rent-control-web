import type { LeaseYear } from '@/shared/types';

export type PeriodType = '1month' | 'custom' | 'year';

export function getMonthsForPeriod(_type: '1month', value: string): string[] {
  return [`${value}-01`];
}

export function getContractYearMonths(startYear: number, leaseStart: string): string[] {
  const parsed = leaseStart ? new Date(leaseStart) : null;
  const startMonth = parsed && !isNaN(parsed.getTime()) ? parsed.getMonth() + 1 : 1;
  return Array.from({ length: 12 }, (_, i) => {
    let m = startMonth + i;
    let y = startYear;
    if (m > 12) { m -= 12; y += 1; }
    return `${y}-${String(m).padStart(2, '0')}-01`;
  });
}

export function getCurrentPeriodValue(type: PeriodType): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (type === '1month') return `${year}-${String(month).padStart(2, '0')}`;
  return String(year);
}

export function getRentForMonth(
  renter: { lease_years: LeaseYear[]; lease_start: string | null },
  monthStr: string
): number {
  const years = renter.lease_years;
  if (!years?.length) return 0;
  if (!renter.lease_start) return years[0].amount;
  const leaseStart = new Date(renter.lease_start);
  if (isNaN(leaseStart.getTime())) return years[0].amount;
  const [y, m] = monthStr.split('-').map(Number);
  const monthDate = new Date(y, m - 1, 1);
  const monthsDiff =
    (monthDate.getFullYear() - leaseStart.getFullYear()) * 12 +
    (monthDate.getMonth() - leaseStart.getMonth());
  if (monthsDiff < 0) return years[0].amount;
  const yearIndex = Math.floor(monthsDiff / 12);
  return years[Math.min(yearIndex, years.length - 1)].amount;
}

// Contract year labels: "25/26" means the year starting in 2025 and ending in 2026
export const YEAR_OPTIONS: { label: string; value: string }[] = (() => {
  const year = new Date().getFullYear();
  return [year, year - 1, year - 2, year - 3].map((y) => ({
    label: `${String(y).slice(2)}/${String(y + 1).slice(2)}`,
    value: String(y),
  }));
})();
