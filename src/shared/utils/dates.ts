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
