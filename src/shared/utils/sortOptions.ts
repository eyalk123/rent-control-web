/**
 * Locale-aware alphabetical ordering for dropdown options.
 *
 * Option labels are user-entered names (property addresses, renters, owners) or translated
 * i18n strings, so they must be collated in the active UI language: a plain `.sort()` orders
 * Hebrew by codepoint and puts every Latin label before every Hebrew one.
 */

export interface SortableOption {
  label: string;
  /** Sentinel rows ("All owners", "Unassigned", "+ Create new") stay above the sorted list. */
  pinned?: boolean;
}

const localeFor = (lang: string) => (lang?.startsWith('he') ? 'he-IL' : 'en-US');

let cached: { locale: string; collator: Intl.Collator } | null = null;

function getCollator(lang: string): Intl.Collator | null {
  const locale = localeFor(lang);
  if (cached?.locale === locale) return cached.collator;
  try {
    // numeric: "Herzl 2" before "Herzl 10". base: case- and niqqud-insensitive.
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    cached = { locale, collator };
    return collator;
  } catch {
    return null;
  }
}

export function compareLabels(a: string, b: string, lang: string): number {
  const collator = getCollator(lang);
  if (collator) return collator.compare(a, b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sorts by label, keeping pinned entries first in their original order. */
export function sortOptions<T extends SortableOption>(options: T[], lang: string): T[] {
  if (options.length < 2) return options;
  const collator = getCollator(lang);
  const compare = collator
    ? (a: T, b: T) => collator.compare(a.label, b.label)
    : (a: T, b: T) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
  const pinned = options.filter((o) => o.pinned);
  const rest = pinned.length ? options.filter((o) => !o.pinned) : [...options];
  rest.sort(compare);
  return pinned.length ? [...pinned, ...rest] : rest;
}

/** `sortOptions` for plain string lists (FormCreatableSelect's owner names). */
export function sortLabels(labels: string[], lang: string): string[] {
  if (labels.length < 2) return labels;
  return [...labels].sort((a, b) => compareLabels(a, b, lang));
}
