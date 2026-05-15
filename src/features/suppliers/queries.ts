import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier } from './api/suppliers';
import type { SupplierCreate, SupplierUpdate } from '@/shared/types';

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (filters: object) => ['suppliers', 'list', filters] as const,
  detail: (id: number) => ['suppliers', id] as const,
};

export function useSuppliers(params?: { categoryId?: number; q?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: supplierKeys.list(params ?? {}),
    queryFn: () => getSuppliers(params),
  });
}

export function useSupplier(id: number) {
  return useQuery({ queryKey: supplierKeys.detail(id), queryFn: () => getSupplierById(id) });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierCreate) => createSupplier(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useUpdateSupplier(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierUpdate) => updateSupplier(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      qc.invalidateQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}
