import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  getPropertyOwners,
  getPropertyOwnerById,
  createPropertyOwner,
  updatePropertyOwner,
  deletePropertyOwner,
} from './api/propertyOwners';
import { propertyKeys } from '@/features/properties/queries';
import type { PropertyOwner, PropertyOwnerCreate, PropertyOwnerUpdate } from '@/shared/types';

export const propertyOwnerKeys = {
  all: ['property-owners'] as const,
  list: (filters: object) => ['property-owners', 'list', filters] as const,
  detail: (id: number) => ['property-owners', id] as const,
};

/** A 409 from the owner endpoints: a name already taken, or a delete while properties remain. */
export function isPropertyOwnerConflict(err: unknown): boolean {
  if (isAxiosError(err)) return err.response?.status === 409;
  return (err as { response?: { status?: number } })?.response?.status === 409;
}

export function usePropertyOwners(params?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: propertyOwnerKeys.list(params ?? {}),
    queryFn: () => getPropertyOwners(params),
  });
}

export function usePropertyOwner(id: number) {
  return useQuery({
    queryKey: propertyOwnerKeys.detail(id),
    queryFn: () => getPropertyOwnerById(id),
    enabled: id > 0,
  });
}

export function useCreatePropertyOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PropertyOwnerCreate) => createPropertyOwner(data),
    onSuccess: (created) => {
      // Into the cached lists at once, so a form that selects the new owner (the property
      // form's "New owner") can match it before the refetch lands.
      qc.setQueriesData<PropertyOwner[]>({ queryKey: ['property-owners', 'list'] }, (old) =>
        old ? [...old, created] : old,
      );
      qc.invalidateQueries({ queryKey: propertyOwnerKeys.all });
    },
  });
}

export function useUpdatePropertyOwner(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PropertyOwnerUpdate) => updatePropertyOwner(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyOwnerKeys.all });
      // A rename shows on every property that names this owner.
      qc.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useDeletePropertyOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePropertyOwner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyOwnerKeys.all }),
  });
}
