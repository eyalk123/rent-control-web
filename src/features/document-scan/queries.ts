import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractLease } from './api/extractLease';
import { extractReceipt } from './api/extractReceipt';
import { subscriptionKeys } from '@/features/subscription/queries';

/** Extraction is a one-shot transform (no cached server state), so it's a mutation. The
 *  optional `signal` lets the owning scan session abort an in-flight extraction. */
export function useExtractLease() {
  return useMutation({
    mutationFn: ({ file, signal }: { file: File; signal?: AbortSignal }) => extractLease(file, signal),
  });
}

/** A receipt scan spends one of the month's receipt scans, so the plan's usage is refetched. */
export function useExtractReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, matchProperty }: { file: File; matchProperty: boolean }) =>
      extractReceipt(file, matchProperty),
    onSettled: () => qc.invalidateQueries({ queryKey: subscriptionKeys.current }),
  });
}
