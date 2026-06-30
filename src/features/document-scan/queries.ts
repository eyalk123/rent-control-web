import { useMutation } from '@tanstack/react-query';
import { extractLease } from './api/extractLease';

/** Extraction is a one-shot transform (no cached server state), so it's a mutation. */
export function useExtractLease() {
  return useMutation({ mutationFn: extractLease });
}
