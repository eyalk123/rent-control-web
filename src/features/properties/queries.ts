import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} from './api/properties';
import { retryNon4xx } from '@/core/api/queryRetry';
import { useSubscription } from '@/features/subscription/queries';
import type { PropertyUpdate } from '@/shared/types';

export const propertyKeys = {
  all: ['properties'] as const,
  detail: (id: number) => ['properties', id] as const,
};

export function useProperties() {
  return useQuery({ queryKey: propertyKeys.all, queryFn: getProperties });
}

/**
 * The properties the account can actually open — every one but those over the plan's limit.
 *
 * For pickers, filters, search and anything that links into a property. A locked property
 * arrives from the API as a stub and every read of it is refused, so offering it anywhere
 * but the properties list (which shows it as a stub, with Upgrade and Delete) would lead to
 * a 402. Locked only while enforcement is on, matching the server.
 */
export function useAccessibleProperties() {
  const query = useProperties();
  const { data: subscription } = useSubscription();
  const data = useMemo(() => {
    if (!query.data || !subscription?.enforced) return query.data;
    const locked = new Set(subscription.locked_property_ids);
    return query.data.filter((p) => !locked.has(p.id));
  }, [query.data, subscription]);
  return { ...query, data };
}

export function useProperty(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getPropertyById(id),
    enabled: (options?.enabled ?? true) && id > 0,
    retry: retryNon4xx,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}

export function useUpdateProperty(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PropertyUpdate) => updateProperty(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.all });
      qc.invalidateQueries({ queryKey: propertyKeys.detail(id) });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}
