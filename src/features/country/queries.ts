import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { setActiveFormat } from '@/shared/utils/money';
import { setActiveCapabilities } from '@/shared/utils/capabilities';
import { setActiveRegistryKeys } from '@/shared/utils/registryLabels';
import {
  getCountries,
  getMyCountry,
  requestCountryNotification,
  setMyCountry,
  type Country,
} from './api/countries';

export const countryKeys = {
  all: ['countries'] as const,
  mine: ['my-country'] as const,
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
 * Writing it here would flip `useMyCountry().blocked` to false the instant the request
 * returned, unmounting the gate before it could show the user what their country does and
 * does not get. The gate owns that transition instead — see `useFinishCountrySetup`.
 */
export function useSetCountry() {
  return useMutation({
    mutationFn: (countryCode: string) => setMyCountry(countryCode),
  });
}

/**
 * Publishes the stored country to the cache, which is what actually dismisses the gate.
 * Separate from the mutation so the disclosure screen gets a chance to be read.
 */
export function useFinishCountrySetup() {
  const qc = useQueryClient();
  return (countryCode: string) => qc.setQueryData(countryKeys.mine, countryCode);
}

/**
 * "Notify me when you add {Country}". Optional and non-blocking by design — a failure
 * here must never stand between the user and the app, so callers fire and forget.
 */
export function useRequestCountryNotification() {
  return useMutation({
    mutationFn: (countryCode: string) => requestCountryNotification(countryCode),
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
export function useApplyCountryFormat(): void {
  const { country } = useMyCountry();
  const config = useCountryConfig(country);

  useEffect(() => {
    if (!config) return;
    setActiveCapabilities(config.capabilities);
    setActiveRegistryKeys(config.registryKey1, config.registryKey2);
    setActiveFormat({
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      currencySymbolPosition: config.currencySymbolPosition,
      numberFormat: config.numberFormat,
      dateFormat: config.dateFormat,
      areaUnit: config.areaUnit,
    });
  }, [config]);
}
