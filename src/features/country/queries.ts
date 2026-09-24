import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { setActiveFormat, setKnownCurrencies } from '@/shared/utils/money';
import {
  setActiveCapabilities,
  setOpenEndedTenancies,
  setRevenueBasisDefault,
} from '@/shared/utils/capabilities';
import { setActiveRegistryKeys } from '@/shared/utils/registryLabels';
import { setActiveIndexKeys } from '@/shared/utils/indexLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { getCountries, getMyCountry, setMyCountry, type Country } from './api/countries';
import {
  getCurrencies,
  getMyPreferences,
  setMyPreferences,
  type Preferences,
} from './api/currencies';
import { resolveEffectiveCurrency } from './effectiveCurrency';

export const countryKeys = {
  all: ['countries'] as const,
  mine: ['my-country'] as const,
  currencies: ['currencies'] as const,
  preferences: ['my-preferences'] as const,
};

/**
 * The country table. Static reference data, so it is cached hard — it changes with a
 * release, never within a session.
 */
export function useCountries(enabled = true) {
  return useQuery({
    queryKey: countryKeys.all,
    queryFn: getCountries,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

/**
 * Whether the signup country gate still has to be answered.
 *
 * `blocked` is deliberately false while loading **and on error**, the same way the legal
 * gate fails open. A country is worth having, but not at the price of locking someone out
 * of their own portfolio because one endpoint is slow or broken — the check simply runs
 * again next time. Only an explicit `country: null` blocks.
 *
 * Every pre-existing account was backfilled to IL, so this never fires for them.
 *
 * `enabled` must be the caller's "is there a signed-in user": firing without a token
 * returns 401, and the api client reads a 401 as an expired session and signs the user out.
 */
export function useMyCountry(enabled = true) {
  const query = useQuery({
    queryKey: countryKeys.mine,
    queryFn: getMyCountry,
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  return {
    ...query,
    country: query.data ?? null,
    blocked: query.isSuccess && query.data == null,
    pending: enabled && query.isPending,
  };
}

/**
 * Stores the country. **Deliberately does not write the cache on success.**
 *
 * The gate owns the transition instead — see `useFinishCountrySetup` — so that dismissing
 * the screen is one decision made in one place rather than a side effect of the write
 * landing. That mattered more when a disclosure step sat between the two; it is kept
 * because mobile's `CountryContext` splits `choose` and `finish` the same way, and a
 * cache write is not something to discover in two different shapes per platform.
 */
export function useSetCountry() {
  return useMutation({
    mutationFn: (countryCode: string) => setMyCountry(countryCode),
  });
}

/** Publishes the stored country to the cache, which is what dismisses the gate. */
export function useFinishCountrySetup() {
  const qc = useQueryClient();
  return (countryCode: string) => qc.setQueryData(countryKeys.mine, countryCode);
}

/** The currency table. Static reference data, cached as hard as the country table. */
export function useCurrencies(enabled = true) {
  return useQuery({
    queryKey: countryKeys.currencies,
    queryFn: getCurrencies,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

/**
 * The account's currency and language choices. Nulls mean "never chose", which is not an
 * error state — it is every account that accepted the defaults, and it is what the
 * fallbacks are for.
 *
 * `enabled` must be the caller's "is there a signed-in user", for the same 401 reason
 * `useMyCountry` documents.
 */
export function useMyPreferences(enabled = true) {
  return useQuery({
    queryKey: countryKeys.preferences,
    queryFn: getMyPreferences,
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

/**
 * Stores either preference.
 *
 * Unlike `useSetCountry` this *does* write the cache on success, because there is no gate
 * transition to own: these are ordinary settings edits and the new value should be live the
 * moment it is saved.
 *
 * A currency change is refused with 409 once the account has a property. The caller must
 * surface that rather than retry — it is an answer, not a failure.
 */
export function useSetPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Preferences>) => setMyPreferences(patch),
    onSuccess: (prefs) => qc.setQueryData(countryKeys.preferences, prefs),
  });
}

/** The config row for a country code, or undefined until the table has loaded. */
export function useCountryConfig(countryCode: string | null): Country | undefined {
  const { data } = useCountries(Boolean(countryCode));
  if (!countryCode) return undefined;
  return data?.find((c) => c.countryCode === countryCode);
}

/**
 * Publishes the account's country to the money/date/number formatters.
 *
 * Module state rather than context because `formatMoney` is called from ~100 places, most
 * of them deep inside render functions where threading a config through would mean touching
 * every component in the chain. Mounted once, high in the tree.
 *
 * Until it resolves the formatters use their Israeli default, which is what the app did
 * before any of this existed — so there is no wrong-currency flash, only the old behaviour
 * for a moment.
 */
export function useApplyCountryFormat(enabled = true): void {
  const { country } = useMyCountry(enabled);
  const config = useCountryConfig(country);
  const { data: currencies } = useCurrencies(Boolean(country));
  const { data: preferences } = useMyPreferences(Boolean(country));
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (currencies) setKnownCurrencies(currencies);
  }, [currencies]);

  /**
   * The account's language wins over the device's, once we know it.
   *
   * This is the whole reason language moved onto the account: it used to live only in
   * `localStorage`, so signing in on a second browser silently reverted the choice. The
   * device value is still the *default* for an account that never chose — `null` here
   * means exactly that, and leaves the device in charge.
   *
   * Settings writes both, so this never fights the user: by the time it re-runs, the
   * account already agrees with what they just picked.
   */
  useEffect(() => {
    const stored = preferences?.language;
    if (!stored || stored === language) return;
    if (stored !== 'en' && stored !== 'he') return;
    setLanguage(stored);
  }, [preferences?.language, language, setLanguage]);

  useEffect(() => {
    if (!config) return;
    setActiveCapabilities(config.capabilities);
    setOpenEndedTenancies(config.openEndedTenancies);
    setRevenueBasisDefault(config.revenueBasisDefault);
    setActiveRegistryKeys(config.registryKey1, config.registryKey2);
    setActiveIndexKeys(config.indexLabelKey, config.indexNoteKey);

    // The chosen currency where there is one, the country's own otherwise. Resolved here
    // rather than in `money.ts` so the formatter stays a formatter and the rule lives in
    // one place per repo — see `effectiveCurrency.ts`.
    const currency = resolveEffectiveCurrency(config, currencies, preferences?.currency ?? null);

    setActiveFormat({
      currency: currency?.code ?? config.currency,
      currencySymbol: currency?.symbol ?? config.currencySymbol,
      currencySymbolPosition: currency?.symbolPosition ?? config.currencySymbolPosition,
      // Spacing stays the country's even when the currency is one the country does not use:
      // it is how this reader writes money, not a property of the money. A German account
      // holding dollars still writes the symbol away from the number.
      currencySymbolSpaced: config.currencySymbolSpaced,
      currencyDecimals: currency?.decimals ?? 2,
      numberFormat: config.numberFormat,
      dateFormat: config.dateFormat,
      areaUnit: config.areaUnit,
    });
  }, [config, currencies, preferences?.currency]);
}
