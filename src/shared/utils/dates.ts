import i18n from '@/core/i18n';

const MONTHS_SHORT: Record<string, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  he: ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'],
};

function shortMonth(locale: string, monthIndex: number): string {
  const key = locale.startsWith('he') ? 'he' : 'en';
  return MONTHS_SHORT[key][monthIndex];
}

/** "15 Apr 2026" — no Intl API, uses static lookup. */
export function formatDateFull(date: Date, locale: string): string {
  return `${date.getDate()} ${shortMonth(locale, date.getMonth())} ${date.getFullYear()}`;
}

/** "15 Apr 2026" from an ISO date string, locale-aware via Intl. Returns the input unchanged if unparseable. */
export function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

/**
 * "Apr 2026" from a `YYYY-MM` key or any ISO date string, locale-aware via Intl.
 * Returns the input unchanged if unparseable.
 */
export function fmtMonthYear(s: string, month: 'short' | 'long' = 'short'): string {
  const d = new Date(s.length === 7 ? `${s}-01` : s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(i18n.language, { month, year: 'numeric' }).format(d);
}

/**
 * Classifies a lease-end date for at-a-glance urgency styling:
 * - `'expired'` — the lease end is before today
 * - `'soon'`    — the lease ends within `monthsAhead` months (default 3)
 * - `null`      — further out, or no lease-end date
 */
export function getLeaseUrgency(
  leaseEnd: Date | null,
  monthsAhead = 3,
): 'expired' | 'soon' | null {
  if (leaseEnd == null) return null;
  const now = new Date();
  if (leaseEnd < now) return 'expired';
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() + monthsAhead);
  return leaseEnd <= threshold ? 'soon' : null;
}
