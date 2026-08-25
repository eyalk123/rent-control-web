/**
 * Onboarding — gate resolvers (web).
 *
 * A tour whose gate is false is *not* consumed: it defers to the next visit. This is what
 * replaces a per-session cap. An irrelevant tour never fires — landing on Transactions
 * with no properties yet teaches nothing — so a curious user is never throttled for
 * exploring, and a tour is only ever spent on a screen that has something to explain.
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
import type { Property, Renter } from '@/shared/types';
import type { GateId } from './types';

/** How many items a list needs before the bulk-select hint is worth showing. */
export const BULK_SELECT_MIN_ITEMS = 3;

export interface GateInputs {
  /** Set by the lease form while the user has CPI / Custom selected. */
  rentMode?: string | null;
}

export function useGates() {
  const { data: properties } = useQuery({ queryKey: propertyKeys.all, queryFn: skipToken });
  const { data: renters } = useQuery({ queryKey: renterKeys.all, queryFn: skipToken });

  const propertyCount = (properties as Property[] | undefined)?.length;
  const renterCount = (renters as Renter[] | undefined)?.length;

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
          // Transactions are paginated and not cheap to count here. A portfolio with
          // renters is the honest proxy: it is the point at which money starts moving.
          return (renterCount ?? 0) > 0;
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
    [propertyCount, renterCount],
  );
}
