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
  /**
   * Whether a space sits between the amount and the symbol.
   *
   * A property of the **country**, not of the currency: €1,234 in Ireland and 1.234 € in
   * Germany are the same money written two ways. Only ever true for a suffix — a prefix
   * symbol is written tight everywhere. Israel is deliberately false, so every existing
   * account keeps printing 5,000₪ exactly as it always has.
   */
  currencySymbolSpaced: boolean;
  /**
   * Maximum fraction digits. A **cap, not a minimum** — `1234` stays `1,234` and
   * `1234.5` becomes `1,234.5`, exactly as before. It exists so a currency with no minor
   * unit (JPY, KRW, XOF) is never shown a fraction of a thing that does not exist.
   */
  currencyDecimals: number;
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
  currencySymbolSpaced: false,
  currencyDecimals: 2,
  numberFormat: '1,234.56',
  dateFormat: 'DMY',
  areaUnit: 'sqm',
};

let active: MoneyFormat = ISRAEL;

/**
 * Every currency the app knows, by code — published alongside the active format.
 *
 * Only needed so `formatMoney(amount, currencyCode)` can print a *symbol* for a row
 * recorded in some other currency rather than echoing `USD 1,234`. Nothing writes rows in
 * a second currency yet (one account is one currency), but every transaction stores the
 * code it was recorded in, so the day that changes the formatter is already right.
 */
let symbols = new Map<string, { symbol: string; decimals: number; position: 'prefix' | 'suffix' }>();

export function setKnownCurrencies(
  list: { code: string; symbol: string; decimals: number; defaultSymbolPosition: 'prefix' | 'suffix' }[],
): void {
  symbols = new Map(
    list.map((c) => [c.code, { symbol: c.symbol, decimals: c.decimals, position: c.defaultSymbolPosition }]),
  );
}

/** Publishes the account's currency and formats. Called once, when they resolve. */
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

function numberFormatter(numberFormat: string, decimals = 2): Intl.NumberFormat {
  const locale = groupingLocale(numberFormat);
  const key = `${locale}:${decimals}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    formatterCache.set(key, cached);
  }
  return cached;
}

/**
 * The separator between a suffix amount and its symbol: a non-breaking space, or nothing.
 *
 * U+00A0 rather than a plain space so an amount is never split across a line break — "2.289"
 * at the end of one line and "€" at the start of the next is not a price. The PDF uses an
 * ordinary space instead, because its figures are drawn into fixed-width cells that cannot
 * wrap and its embedded font would have to carry the glyph; the two render identically.
 */
function gap(format: MoneyFormat): string {
  return format.currencySymbolSpaced ? '\u00a0' : '';
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
  let format = active;
  if (currencyCode && currencyCode !== active.currency) {
    // A row recorded in some other currency. Look the symbol up rather than echoing the
    // code — falling back to the code itself only when the table has no glyph for it,
    // which is the same thing the backend does.
    const known = symbols.get(currencyCode);
    format = {
      ...active,
      currency: currencyCode,
      currencySymbol: known?.symbol ?? currencyCode,
      currencySymbolPosition: known?.position ?? active.currencySymbolPosition,
      currencyDecimals: known?.decimals ?? active.currencyDecimals,
    };
  }

  if (amount == null || isNaN(amount)) {
    return format.currencySymbolPosition === 'prefix'
      ? `${format.currencySymbol}0`
      : `0${gap(format)}${format.currencySymbol}`;
  }
  const text = numberFormatter(format.numberFormat, format.currencyDecimals).format(amount);
  return format.currencySymbolPosition === 'prefix'
    ? `${format.currencySymbol}${text}`
    : `${text}${gap(format)}${format.currencySymbol}`;
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

/**
 * Floor area.
 *
 * **Nothing is converted, in either direction.** The number in the column is the number the
 * owner typed, and the field tells them which unit they are typing in.
 *
 * It used to convert: store canonical square metres, show the account's unit. That is a
 * reasonable-sounding rule and it was wrong here. The column is an integer, so a US owner
 * typing `1200` sq ft stored `111` m², and `111` m² reads back as `1195` sq ft — their own
 * number, quietly rounded off. Canonical storage buys comparability across accounts and
 * unit-free arithmetic; floor area is display-only (nothing reports, aggregates, filters or
 * sorts on it), so it bought neither, and charged a real user a real number for it.
 *
 * The stored value is never ambiguous, because the unit follows the account: `area_unit`
 * comes from the country, and the country is fixed once the account has a property. Anything
 * that ever needs a common unit can convert on read, from `owner.country`, without having
 * altered what anyone entered.
 */

/** The unit the account enters and reads areas in. */
export function areaUnitLabel(): string {
  return active.areaUnit === 'sqft' ? 'sq ft' : 'm²';
}

/** The stored number with the account's unit. Grouping only — the value is untouched. */
export function formatArea(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  return `${numberFormatter(active.numberFormat).format(value)} ${areaUnitLabel()}`;
}
