/**
 * The two land-registry identifier labels, which are the only labels in the app whose
 * *concept* changes by country.
 *
 * Israel has a Block and a Parcel (גוש / חלקה). The UK has a single Title number, the US a
 * Parcel number, much of southern Europe a Cadastral reference. These are not different
 * words for one thing — they are different things — which is why the country config has a
 * say here and nowhere else in the label set.
 *
 * What it stores is an **i18n key, not a finished string**. A label depends on two
 * independent axes: the country decides *which concept applies*, the language decides *how
 * to say it*. A finished string in the config conflates them and breaks on a case that
 * already exists — an Israeli landlord reading the app in French. Adding a language costs
 * one translation per concept (about six), not one per country.
 *
 * Israel sends `null`, meaning "no override": the app falls through to `property.block` and
 * `property.plot` exactly as it always did, so its rendering path is untouched code rather
 * than re-verified code, and Hebrew keeps working without the config knowing Hebrew exists.
 * `null` is also the right answer for a country nobody has hand-checked — generic, never
 * wrong.
 */

let keys: { one: string | null; two: string | null } = { one: null, two: null };

export function setActiveRegistryKeys(one: string | null, two: string | null): void {
  keys = { one, two };
}

/** The i18n key for the first registry field. */
export function registryKey1(): string {
  return keys.one ?? 'property.block';
}

/** The i18n key for the second registry field, or null where the country has only one. */
export function registryKey2(): string | null {
  // Israel's fall-through is `property.plot`; a country that declared only one identifier
  // has no second field at all, and the form should not show an empty box for it.
  if (keys.one === null) return 'property.plot';
  return keys.two;
}
