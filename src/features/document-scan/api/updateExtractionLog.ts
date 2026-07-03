import apiClient from '@/core/api/client';
import type { ProvenanceItem } from '../types';

export interface FieldEditPayload {
  field: string;
  prefilled_value: string;
  submitted_value: string;
  source_text: string | null;
}

export interface UpdateLogPayload {
  entity_type: 'property' | 'renter';
  created_id?: number | null;
  contract_url?: string | null;
  fields_given_count: number;
  field_edits: FieldEditPayload[];
}

/** Diff the submitted form values against what we prefilled. A field counts as "given"
 *  only if we filled it with a non-empty value, and as "changed" only if the user then
 *  altered that value — filling a field we left blank is neither. */
export function diffProvenance(
  provenance: ProvenanceItem[],
  values: Record<string, unknown>,
): { fields_given_count: number; field_edits: FieldEditPayload[] } {
  const given = provenance.filter((p) => p.prefilledValue.trim() !== '');
  const field_edits: FieldEditPayload[] = [];
  for (const p of given) {
    const prefilled = p.prefilledValue.trim();
    const submitted = String(values[p.formKey] ?? '').trim();
    if (submitted !== prefilled) {
      field_edits.push({ field: p.labelKey, prefilled_value: prefilled, submitted_value: submitted, source_text: p.source });
    }
  }
  return { fields_given_count: given.length, field_edits };
}

/** Record one form's submit outcome against the extraction log. Fire-and-forget —
 *  auditing must never block or fail the user's save. */
export function updateExtractionLog(logId: number, payload: UpdateLogPayload): void {
  apiClient.patch(`/extract/logs/${logId}`, payload).catch(() => {});
}
