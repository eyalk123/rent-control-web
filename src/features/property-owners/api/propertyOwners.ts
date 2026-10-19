import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockPropertyOwnersApi } from '@/core/api/mock';
import type { PropertyOwner, PropertyOwnerCreate, PropertyOwnerUpdate } from '@/shared/types';

export async function getPropertyOwners(
  params: { includeInactive?: boolean } = {},
): Promise<PropertyOwner[]> {
  if (USE_MOCK_API) {
    return mockPropertyOwnersApi.getPropertyOwners(params);
  }

  const response = await apiClient.get<PropertyOwner[]>('/property-owners', {
    params: { include_inactive: params.includeInactive },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getPropertyOwnerById(id: number): Promise<PropertyOwner> {
  if (USE_MOCK_API) {
    return mockPropertyOwnersApi.getPropertyOwnerById(id);
  }

  const response = await apiClient.get<PropertyOwner>(`/property-owners/${id}`);
  return response.data;
}

export async function createPropertyOwner(data: PropertyOwnerCreate): Promise<PropertyOwner> {
  if (USE_MOCK_API) {
    return mockPropertyOwnersApi.createPropertyOwner(data);
  }

  const response = await apiClient.post<PropertyOwner>('/property-owners', {
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    notes: data.notes ?? null,
    bank_account: data.bank_account ?? null,
    is_company: data.is_company ?? false,
    birth_date: data.birth_date ?? null,
    over_60: data.over_60 ?? false,
  });
  return response.data;
}

export async function updatePropertyOwner(
  id: number,
  data: PropertyOwnerUpdate,
): Promise<PropertyOwner> {
  if (USE_MOCK_API) {
    return mockPropertyOwnersApi.updatePropertyOwner(id, data);
  }

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined) payload.phone = data.phone ?? null;
  if (data.email !== undefined) payload.email = data.email ?? null;
  if (data.notes !== undefined) payload.notes = data.notes ?? null;
  if (data.bank_account !== undefined) payload.bank_account = data.bank_account ?? null;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.is_company !== undefined) payload.is_company = data.is_company;
  if (data.birth_date !== undefined) payload.birth_date = data.birth_date ?? null;
  if (data.over_60 !== undefined) payload.over_60 = data.over_60;

  const response = await apiClient.patch<PropertyOwner>(`/property-owners/${id}`, payload);
  return response.data;
}

export async function deletePropertyOwner(id: number): Promise<void> {
  if (USE_MOCK_API) {
    return mockPropertyOwnersApi.deletePropertyOwner(id);
  }

  await apiClient.delete(`/property-owners/${id}`);
}
