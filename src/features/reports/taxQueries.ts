import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTaxGroup,
  deleteTaxGroup,
  getTaxReport,
  saveTaxInputs,
  updateTaxGroup,
  type TaxGroupWrite,
} from './api/taxTracks';

export const taxKeys = {
  all: ['tax-tracks'] as const,
  report: (year: number) => ['tax-tracks', 'report', year] as const,
};

export function useTaxReport(year: number) {
  return useQuery({ queryKey: taxKeys.report(year), queryFn: () => getTaxReport(year) });
}

/** Create when `id` is absent, replace otherwise. Every year's report moves with a group. */
export function useSaveTaxGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: TaxGroupWrite }) =>
      id ? updateTaxGroup(id, data) : createTaxGroup(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: taxKeys.all }),
  });
}

export function useDeleteTaxGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTaxGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: taxKeys.all }),
  });
}

export function useSaveTaxInputs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveTaxInputs,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: taxKeys.report(vars.year) }),
  });
}
