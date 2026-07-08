import type { RenterFormValues } from '@/features/renters/validation/renterValidation';

/** One renter field where the scanned lease disagrees with the existing renter record. */
export interface RenterFieldConflict {
  formKey: string; // RHF field key, e.g. 'phone'
  labelKey: string; // i18n label key (from the scan provenance)
  existing: string; // stored value, as a display string
  scanned: string; // scanned lease value, as a display string
}

/** Fields never offered as conflicts: the name is the duplicate-match identity key; propertyId is
 *  the association handled by the summary; file urls are handled outside the scalar diff; and
 *  leaseYears/extraContacts are nested structures (compared as arrays is noisy — the scalar lease
 *  intent fields drive the LeaseTermBuilder instead). */
const RENTER_EXCLUDE_FIELDS = new Set<string>([
  'firstName',
  'lastName',
  'propertyId',
  'idImageUrl',
  'fullContractUrl',
  'leaseYears',
  'extraContacts',
]);

const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** Compare a scanned renter prefill against the values an existing renter was reset into (both in
 *  RHF form-value space, so no backend-field mapping is needed) and split the difference into:
 *   - `fills`: fields the scan found that the existing renter left blank — applied silently.
 *   - `conflicts`: fields both sides have but that differ — surfaced to the user to keep/replace.
 *  Identity/association/nested fields are excluded (see `RENTER_EXCLUDE_FIELDS`). */
export function diffScannedRenter(
  scanPrefill: Record<string, unknown> | undefined,
  existingValues: Record<string, unknown>,
  labelByKey: Map<string, string>,
): { fills: Partial<RenterFormValues>; conflicts: RenterFieldConflict[] } {
  const fills: Record<string, unknown> = {};
  const conflicts: RenterFieldConflict[] = [];
  if (!scanPrefill) return { fills, conflicts };

  const scan = scanPrefill;
  const existing = existingValues;

  for (const key of Object.keys(scan)) {
    if (RENTER_EXCLUDE_FIELDS.has(key)) continue;
    const rawScanned = scan[key];
    if (Array.isArray(rawScanned) || (rawScanned !== null && typeof rawScanned === 'object')) continue;
    const scanned = toStr(rawScanned).trim();
    if (!scanned) continue;
    const existingStr = toStr(existing[key]).trim();
    if (!existingStr) {
      fills[key] = rawScanned; // existing blank -> fill from scan
      continue;
    }
    if (scanned === existingStr) continue;
    conflicts.push({ formKey: key, labelKey: labelByKey.get(key) ?? key, existing: existingStr, scanned });
  }

  return { fills: fills as Partial<RenterFormValues>, conflicts };
}
