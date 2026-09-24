import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acknowledgeLockNotice, getSubscription } from './api/subscriptionApi';
import { CHECKOUT_AVAILABLE, loadOffering } from './checkout';
import type { Subscription } from './types';

export const subscriptionKeys = {
  current: ['subscription'] as const,
};

/**
 * The account's plan. Read by the paywall, the locked badges and the feature gates.
 *
 * Cached for a minute rather than indefinitely: a purchase completes out of band — the
 * webhook lands on the server, not in this tab — so a long cache would leave someone who
 * has just paid still looking at a paywall.
 *
 * `pollMs` refetches on an interval — used only while the plan picker waits for a purchase's
 * webhook to land. Every other caller leaves it off.
 */
export function useSubscription(options: { pollMs?: number | false } = {}) {
  return useQuery({
    queryKey: subscriptionKeys.current,
    queryFn: getSubscription,
    staleTime: 60_000,
    refetchInterval: options.pollMs ?? false,
  });
}

/**
 * The RevenueCat offering the plan picker sells — the real prices Paddle will charge, as
 * opposed to the display prices in `tiers.ts`. Fetched once per account per visit.
 */
export function useCheckoutOffering(appUserId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['subscription', 'offering', appUserId] as const,
    queryFn: () => loadOffering(appUserId as string),
    enabled: enabled && CHECKOUT_AVAILABLE && Boolean(appUserId),
    staleTime: Infinity,
    retry: 1,
  });
}

export function useAcknowledgeLockNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acknowledgeLockNotice,
    onSuccess: () => {
      // Flip the flag locally rather than refetching. The ack is the only thing that
      // changed, and a refetch here would make the notice visibly blink out.
      queryClient.setQueryData<Subscription>(subscriptionKeys.current, (current) =>
        current ? { ...current, show_lock_notice: false } : current,
      );
    },
  });
}

/**
 * Whether this property is over the plan's ceiling.
 *
 * Reads the flag the API already put on the property, falling back to the id list from
 * `/subscription`. Both come from one server-side resolution, so they cannot disagree —
 * the fallback exists for callers that hold an id but not the object.
 */
export function useIsPropertyLocked(propertyId: number | null | undefined): boolean {
  const { data } = useSubscription();
  if (propertyId == null || !data?.enforced) return false;
  return data.locked_property_ids.includes(propertyId);
}
