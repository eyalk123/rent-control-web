import { useMutation } from '@tanstack/react-query';
import { extractLease } from './api/extractLease';

/** Extraction is a one-shot transform (no cached server state), so it's a mutation. The
 *  optional `signal` lets the owning scan session abort an in-flight extraction. */
export function useExtractLease() {
  return useMutation({
    mutationFn: ({ file, signal }: { file: File; signal?: AbortSignal }) => extractLease(file, signal),
  });
}
