export { getRentForMonth } from '@/shared/types';

export type PeriodType = '1month' | '3months' | '6months' | 'custom' | 'year';

export function getMonthsForPeriod(type: '1month' | '3months' | '6months', value: string): string[] {
  if (type === '1month') return [`${value}-01`];
  const count = type === '3months' ? 3 : 6;
  const [y, m] = value.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    let month = m - i;
    let year = y;
    while (month < 1) { month += 12; year -= 1; }
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }).reverse();
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
  if (type === '1month' || type === '3months' || type === '6months') {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  return String(year);
}

// Contract year labels: "25/26" means the year starting in 2025 and ending in 2026
export const YEAR_OPTIONS: { label: string; value: string }[] = (() => {
  const year = new Date().getFullYear();
  return [year, year - 1, year - 2, year - 3].map((y) => ({
    label: `${String(y).slice(2)}/${String(y + 1).slice(2)}`,
    value: String(y),
  }));
})();
