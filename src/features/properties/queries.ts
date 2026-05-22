import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImage,
} from './api/properties';
import type { PropertyCreate, PropertyUpdate } from '@/shared/types';

export const propertyKeys = {
  all: ['properties'] as const,
  detail: (id: number) => ['properties', id] as const,
};

export function useProperties() {
  return useQuery({ queryKey: propertyKeys.all, queryFn: getProperties });
}

export function useProperty(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getPropertyById(id),
    enabled: (options?.enabled ?? true) && id > 0,
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

export function useUploadPropertyImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadPropertyImage(id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.all });
      qc.invalidateQueries({ queryKey: propertyKeys.detail(id) });
    },
  });
}

// For use in create – we don't have an id yet, so we pass create + image together
export function useCreatePropertyWithImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, imageFile }: { data: PropertyCreate; imageFile?: File | null }) => {
      const property = await createProperty(data);
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        await uploadPropertyImage(property.id, fd);
      }
      return property;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}
