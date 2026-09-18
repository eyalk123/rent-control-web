/**
 * Onboarding — gate resolvers (web).
 *
 * A tour whose gate is false is *not* consumed: it defers to the next visit. This is what
 * replaces a per-session cap — a curious user is never throttled for exploring, and a
 * tour is only ever spent where it has something to say.
 *
 * Emptiness is no longer one of those gates. The list tours used to be held shut until
 * their screen had rows on it, which meant the person the tour was written for — someone
 * who has just signed up and has nothing anywhere — was the only person who never saw it.
 * They run on an empty screen now, and the handful of steps that genuinely need content
 * to point at drop themselves through `skipWhen: 'noProperties'` and its siblings.
 *
 * Where mobile reads two global contexts, web reads the React Query cache *passively*.
 * `skipToken` subscribes this hook to the properties and renters entries without ever
 * issuing a request, which matters because the controller is mounted in AppShell and so
 * runs on every route: calling `useProperties()` here would put two extra fetches on
 * every page load, forever, on behalf of a feature that is finished after the first week
 * of an account's life.
 *
 * The trade is that a gate can only answer from data some screen has already loaded.
 * That is the same rule as mobile's `loading` guard and it fails in the same safe
 * direction — unknown reads as false, the tour defers, and it opens on a later visit
 * once a page has populated the cache. It never fires against a list that merely looks
 * empty.
 */
import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { propertyKeys } from '@/features/properties/queries';
import { renterKeys } from '@/features/renters/queries';
import { transactionKeys } from '@/features/transactions/queries';
import type { Property, Renter } from '@/shared/types';
import { useCountryConfig, useMyCountry } from '@/features/country/queries';
import type { Capabilities } from '@/shared/utils/capabilities';
import type { GateId } from './types';

/** How many items a list needs before the bulk-select hint is worth showing. */
export const BULK_SELECT_MIN_ITEMS = 3;

export interface GateInputs {
  /** Set by the lease form while the user has CPI / Custom selected. */
  rentMode?: string | null;
}

/**
 * Whether a gate can be answered *at all* yet, as opposed to what the answer is.
 *
 * `useGates` folds "not loaded" into `false`, which is the safe direction for a tour: an
 * unanswerable gate defers it. `skipWhen` inverts that — false means "keep the step" — so
 * a tour opening before the properties query settles would show the closing "start with
 * one property" card to someone with a full portfolio. The controller waits on this
 * instead, within the same anchor deadline.
 */
export function useGateKnown() {
  const { data: properties } = useQuery({ queryKey: propertyKeys.all, queryFn: skipToken });
  const { data: renters } = useQuery({ queryKey: renterKeys.all, queryFn: skipToken });
  const { data: ledger } = useQuery({ queryKey: transactionKeys.list({}), queryFn: skipToken });

  return useCallback(
    (gate: GateId): boolean => {
      switch (gate) {
        case 'hasProperties':
        case 'noProperties':
          return properties !== undefined;
        case 'hasRenters':
        case 'noRenters':
          return renters !== undefined;
        case 'hasTransactions':
        case 'noTransactions':
          return ledger !== undefined;
        case 'listHasThreeItems':
          return properties !== undefined && renters !== undefined;
        // `always` and the rent-mode gates read no server data — they are always answerable.
        default:
          return true;
      }
    },
    [properties, renters, ledger],
  );
}

export function useGates() {
  const { data: properties } = useQuery({ queryKey: propertyKeys.all, queryFn: skipToken });
  const { data: renters } = useQuery({ queryKey: renterKeys.all, queryFn: skipToken });
  const { data: ledger } = useQuery({ queryKey: transactionKeys.list({}), queryFn: skipToken });

  const propertyCount = (properties as Property[] | undefined)?.length;
  const renterCount = (renters as Renter[] | undefined)?.length;

  /**
   * Whether the ledger has anything in it, read from the *unfiltered* transactions list —
   * `transactionKeys.list({})`, the exact entry both Home and the Transactions screen
   * populate when no type filter is on. It used to be proxied by "has renters", which is
   * cold for someone who navigates straight to Transactions and only ever a guess anyway.
   *
   * This one settles at the same moment as the list it describes, which is what the step
   * that consults it needs: the month heading it points at appears on the same render.
   * An infinite query, hence the pages.
   */
  const ledgerPages = (ledger as { pages: unknown[][] } | undefined)?.pages;
  const anyTransactions = ledgerPages?.some((page) => page.length > 0);

  return useCallback(
    (gate: GateId, inputs: GateInputs = {}): boolean => {
      switch (gate) {
        case 'always':
          return true;
        case 'hasProperties':
          return (propertyCount ?? 0) > 0;
        case 'hasRenters':
          return (renterCount ?? 0) > 0;
        case 'hasTransactions':
          return anyTransactions === true;
        // The negations, for `skipWhen`. Not `!hasProperties` written out: an unloaded
        // cache reads as 0 here, and the controller is what keeps that from being
        // mistaken for empty — it holds a tour shut until `useGateKnown` says every
        // conditional step can be answered.
        case 'noProperties':
          return (propertyCount ?? 0) === 0;
        case 'noRenters':
          return (renterCount ?? 0) === 0;
        case 'noTransactions':
          return anyTransactions === false;
        case 'listHasThreeItems':
          return (
            (propertyCount ?? 0) >= BULK_SELECT_MIN_ITEMS ||
            (renterCount ?? 0) >= BULK_SELECT_MIN_ITEMS
          );
        case 'cpiSelected':
          return inputs.rentMode === 'cpi';
        case 'customSelected':
          return inputs.rentMode === 'custom';
        default:
          return false;
      }
    },
    [propertyCount, renterCount, anyTransactions],
  );
}

/**
 * Whether the account's country actually has a capability a step or seed depends on.
 *
 * Separate from `useGates` because it answers a different kind of question — `GateId` asks
 * about the account's *data*, this asks what the product even offers here — and because it
 * must come from the **reactive** country query rather than `capabilities()` in
 * `shared/utils/capabilities.ts`. That module is plain module state: reading it here would
 * never invalidate this callback, which is the controller's retry mechanism, and its
 * default is Israel's full set, so a tour opening before the config landed would be told
 * CPI exists and would show a seed advertising a control that is not on the screen.
 *
 * `useMyCountry` and `useCountries` are already mounted by `ProtectedRoute`, so subscribing
 * here costs no extra request — React Query hands back the same cache entries.
 */
export function useCapability() {
  const { country } = useMyCountry();
  const config = useCountryConfig(country);

  return useCallback(
    (requires: keyof Capabilities | undefined): boolean => {
      if (!requires) return true;
      return config?.capabilities?.[requires] === true;
    },
    [config],
  );
}

/**
 * Whether the capability question can be answered yet, as opposed to what the answer is.
 *
 * The mirror of `useGateKnown`, and needed for the same reason: an unanswerable capability
 * must hold the tour rather than resolve to the permissive default. A tour that opens a
 * moment too early would keep a CPI step in a country that has no index.
 */
export function useCapabilityKnown(): boolean {
  const { country } = useMyCountry();
  const config = useCountryConfig(country);
  return config !== undefined;
}
