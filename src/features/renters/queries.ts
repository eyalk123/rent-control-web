import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRenters,
  getRenterById,
  createRenter,
  updateRenter,
  deleteRenter,
  terminateLease,
  undoTermination,
} from './api/renters';
import { retryNon4xx } from '@/core/api/queryRetry';
import { notificationKeys } from '@/features/notifications/queries';
import type { RenterCreate, RenterUpdate } from '@/shared/types';

export const renterKeys = {
  all: ['renters'] as const,
  detail: (id: number) => ['renters', id] as const,
};

export function useRenters() {
  return useQuery({ queryKey: renterKeys.all, queryFn: getRenters });
}

export function useRenter(id: number) {
  return useQuery({
    queryKey: renterKeys.detail(id),
    queryFn: () => getRenterById(id),
    enabled: id > 0,
    retry: retryNon4xx,
  });
}

export function useCreateRenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RenterCreate) => createRenter(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renterKeys.all });
      // Overdue / expiring status pills come from the home lists, not the
      // renter row itself — refresh them or the pill stays stale.
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useUpdateRenter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RenterUpdate) => updateRenter(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renterKeys.all });
      qc.invalidateQueries({ queryKey: renterKeys.detail(id) });
      // Payment day / lease dates drive the overdue + expiring lists that back
      // the status pill; invalidate them too.
      qc.invalidateQueries({ queryKey: ['home'] });
      // A lease extension resolves any lease_expiring alert; refresh the feed.
      qc.invalidateQueries({ queryKey: notificationKeys.feed });
    },
  });
}

export function useDeleteRenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRenter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renterKeys.all });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/**
 * Ending or reopening a lease moves the renter in and out of every active window on the
 * server, so the same caches an edit touches have to be refreshed: the lists that back
 * the status pill, and the notification feed the closed lease is dropping out of.
 */
function useLeaseLifecycleMutation<TArgs>(
  id: number,
  mutationFn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renterKeys.all });
      qc.invalidateQueries({ queryKey: renterKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: notificationKeys.feed });
    },
  });
}

export function useTerminateLease(id: number) {
  return useLeaseLifecycleMutation<{ terminated_on: string; reason?: string | null }>(
    id,
    (data) => terminateLease(id, data),
  );
}

export function useUndoTermination(id: number) {
  return useLeaseLifecycleMutation<void>(id, () => undoTermination(id));
}
