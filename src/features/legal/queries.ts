import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLegalStatus,
  outstandingDocuments,
  postLegalAcceptance,
  type LegalDocument,
  type LegalStatus,
} from './api/legalAcceptance';

export const legalKeys = {
  status: ['legal-status'] as const,
};

/**
 * Which legal documents the signed-in account still owes acceptance of.
 *
 * Long-lived: it changes once, when they accept. `retry: 1` and a long staleTime keep this
 * off the hot path after the first load — it runs on sign-in, not on every navigation.
 *
 * `blocked` is deliberately false while loading AND on error. A consent record is worth
 * having, but not at the price of locking someone out of their own portfolio because this
 * one endpoint is slow or broken; the check simply runs again next time. An explicit "you
 * have not accepted" is the only answer that blocks.
 *
 * `enabled` must be the caller's "is there a signed-in user" — firing this without a token
 * returns 401, and the response interceptor treats a 401 as a session expiry and signs the
 * user out. `isLoading` is false rather than true while disabled, so a caller that gates a
 * spinner on it does not hang on the sign-in page.
 */
export function useLegalStatus(enabled = true) {
  const query = useQuery({
    queryKey: legalKeys.status,
    queryFn: getLegalStatus,
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const outstanding = query.data ? outstandingDocuments(query.data) : [];
  return {
    ...query,
    outstanding,
    blocked: query.isSuccess && outstanding.length > 0,
    pending: enabled && query.isPending,
  };
}

export function useAcceptLegal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documents: LegalDocument[]) => postLegalAcceptance(documents),
    onSuccess: (status) => {
      // Null means mock mode answered without a server; leave the cache to refetch rather
      // than writing an empty status over a good one.
      if (status) qc.setQueryData<LegalStatus>(legalKeys.status, status);
      else qc.invalidateQueries({ queryKey: legalKeys.status });
    },
  });
}
