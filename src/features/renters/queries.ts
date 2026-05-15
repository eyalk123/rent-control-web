import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRenters, getRenterById, createRenter, updateRenter, deleteRenter } from './api/renters';
import type { RenterCreate, RenterUpdate } from '@/shared/types';

export const renterKeys = {
  all: ['renters'] as const,
  detail: (id: number) => ['renters', id] as const,
};

export function useRenters() {
  return useQuery({ queryKey: renterKeys.all, queryFn: getRenters });
}

export function useRenter(id: number) {
  return useQuery({ queryKey: renterKeys.detail(id), queryFn: () => getRenterById(id) });
}

export function useCreateRenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RenterCreate) => createRenter(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: renterKeys.all }),
  });
}

export function useUpdateRenter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RenterUpdate) => updateRenter(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renterKeys.all });
      qc.invalidateQueries({ queryKey: renterKeys.detail(id) });
    },
  });
}

export function useDeleteRenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRenter,
    onSuccess: () => qc.invalidateQueries({ queryKey: renterKeys.all }),
  });
}
