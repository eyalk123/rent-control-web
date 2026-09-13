/**
 * Money, dates and numbers, formatted for the account's country.
 *
 * **`formatMoney(amount)` keeps its original one-argument signature on purpose.** It is
 * called from something like a hundred places across the app, most of them deep inside
 * render functions where threading a config through would mean touching every component in
 * the chain. Instead the active format is module state, published once when the country
 * config resolves (`setActiveFormat`), and every call site is unchanged.
 *
 * **The default is Israel's exact current behaviour**, not a neutral placeholder. That is
 * what makes an Israeli account byte-for-byte identical and what keeps the app correct
 * during the moment between first paint and the config arriving: the fallback is not a
 * guess, it is what the app already did.
 */

export interface MoneyFormat {
  currency: string;
  currencySymbol: string;
  currencySymbolPosition: 'prefix' | 'suffix';
  /** One of the three grouping styles in the country table. */
  numberFormat: string;
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  areaUnit: 'sqm' | 'sqft';
}

/** What the app did before any of this existed. Also Israel, permanently. */
const ISRAEL: MoneyFormat = {
  currency: 'ILS',
  currencySymbol: '₪',
  currencySymbolPosition: 'suffix',
  numberFormat: '1,234.56',
  dateFormat: 'DMY',
  areaUnit: 'sqm',
};

let active: MoneyFormat = ISRAEL;

/** Publishes the account's country config. Called once, when it resolves. */
export function setActiveFormat(format: MoneyFormat): void {
  active = format;
}

export function getActiveFormat(): MoneyFormat {
  return active;
}

/**
 * The locale whose grouping and decimal separators match a `numberFormat` style.
 *
 * Chosen by the shape the country table declares rather than by the country's own locale,
 * so the three styles stay exactly three. `en-US` gives `1,234.56`, `de-DE` gives
 * `1.234,56`, `fr-FR` gives `1 234,56` — and `en-US` is what this app has always used, so
 * the Israeli path is unchanged.
 */
function groupingLocale(numberFormat: string): string {
  if (numberFormat === '1.234,56') return 'de-DE';
  if (numberFormat === '1 234,56') return 'fr-FR';
  return 'en-US';
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function numberFormatter(numberFormat: string): Intl.NumberFormat {
  const locale = groupingLocale(numberFormat);
  let cached = formatterCache.get(locale);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatterCache.set(locale, cached);
  }
  return cached;
}

/**
 * An amount with its currency.
 *
 * `currencyCode` overrides the account's currency for a row that carries its own — every
 * transaction stores the currency it was recorded in, and a historical row must keep
 * printing what it was actually worth rather than being re-denominated by a later change.
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode?: string | null,
): string {
  const format =
    currencyCode && currencyCode !== active.currency
      ? { ...active, currency: currencyCode, currencySymbol: currencyCode }
      : active;

  if (amount == null || isNaN(amount)) {
    return format.currencySymbolPosition === 'prefix'
      ? `${format.currencySymbol}0`
      : `0${format.currencySymbol}`;
  }
  const text = numberFormatter(format.numberFormat).format(amount);
  return format.currencySymbolPosition === 'prefix'
    ? `${format.currencySymbol}${text}`
    : `${text}${format.currencySymbol}`;
}

/** The bare currency symbol, for a placeholder or a suffix next to an input. */
export function currencySymbol(): string {
  return active.currencySymbol;
}

/** Whether the symbol goes before the amount, for laying out an input adornment. */
export function currencyIsPrefix(): boolean {
  return active.currencySymbolPosition === 'prefix';
}

/** A number with the account's grouping, and no currency. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0';
  return numberFormatter(active.numberFormat).format(value);
}

/**
 * A date in the account's field order.
 *
 * Takes `YYYY-MM-DD` or a Date. Parsed by parts rather than by `new Date(string)`, which
 * reads a bare date as UTC midnight and can render the previous day west of Greenwich.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  let y: number, m: number, d: number;
  if (value instanceof Date) {
    y = value.getFullYear();
    m = value.getMonth() + 1;
    d = value.getDate();
  } else {
    const parts = value.slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return String(value);
    [y, m, d] = parts;
  }
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  if (active.dateFormat === 'MDY') return `${mm}/${dd}/${y}`;
  if (active.dateFormat === 'YMD') return `${y}-${mm}-${dd}`;
  return `${dd}/${mm}/${y}`;
}

/** Square metres as stored, converted only for display where the country uses sq ft. */
const SQFT_PER_SQM = 10.7639;

export function formatArea(squareMetres: number | null | undefined): string {
  if (squareMetres == null || isNaN(squareMetres)) return '';
  if (active.areaUnit === 'sqft') {
    return `${numberFormatter(active.numberFormat).format(Math.round(squareMetres * SQFT_PER_SQM))} sq ft`;
  }
  return `${numberFormatter(active.numberFormat).format(squareMetres)} m²`;
}
