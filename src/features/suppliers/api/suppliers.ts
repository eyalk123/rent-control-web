import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockSuppliersApi } from '@/core/api/mock';
import type { Supplier, SupplierCreate, SupplierUpdate } from '@/shared/types';

export type SuppliersListParams = {
  categoryId?: number;
  q?: string;
  includeInactive?: boolean;
};

export async function getSuppliers(
  params: SuppliersListParams = {},
): Promise<Supplier[]> {
  if (USE_MOCK_API) {
    return mockSuppliersApi.getSuppliers(params);
  }

  const response = await apiClient.get<Supplier[]>('/suppliers', {
    params: {
      category_id: params.categoryId,
      q: params.q,
      include_inactive: params.includeInactive,
    },
  });

  const data = response.data;
  return Array.isArray(data) ? data : [];
}

export async function getSupplierById(id: number): Promise<Supplier> {
  if (USE_MOCK_API) {
    return mockSuppliersApi.getSupplierById(id);
  }

  const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
  return response.data;
}

export async function createSupplier(data: SupplierCreate): Promise<Supplier> {
  if (USE_MOCK_API) {
    return mockSuppliersApi.createSupplier(data);
  }

  const payload = {
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    notes: data.notes ?? null,
    bank_account: data.bank_account ?? null,
    category_ids: data.category_ids,
  };

  const response = await apiClient.post<Supplier>('/suppliers', payload);
  return response.data;
}

export async function updateSupplier(
  id: number,
  data: SupplierUpdate,
): Promise<Supplier> {
  if (USE_MOCK_API) {
    return mockSuppliersApi.updateSupplier(id, data);
  }

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined) payload.phone = data.phone ?? null;
  if (data.email !== undefined) payload.email = data.email ?? null;
  if (data.notes !== undefined) payload.notes = data.notes ?? null;
  if (data.bank_account !== undefined) payload.bank_account = data.bank_account ?? null;
  if (data.category_ids !== undefined) payload.category_ids = data.category_ids;
  if (data.is_active !== undefined) payload.is_active = data.is_active;

  const response = await apiClient.patch<Supplier>(`/suppliers/${id}`, payload);
  return response.data;
}
