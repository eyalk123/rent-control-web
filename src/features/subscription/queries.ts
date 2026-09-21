import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acknowledgeLockNotice, getSubscription } from './api/subscriptionApi';
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
 */
export function useSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.current,
    queryFn: getSubscription,
    staleTime: 60_000,
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
