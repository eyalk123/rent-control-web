import { PROPERTY_SCAN_FIELDS } from './propertyFields';

/** Backend fields that make up the address identity (see `addressesMatch`) — excluded from the
 *  conflict diff because a mismatch there means the wrong property was chosen. */
const MATCH_KEY_FIELDS = new Set(['address', 'city', 'floor', 'apartment']);

/** One property form field where the scanned lease disagrees with the existing property, in the
 *  RHF form-value space (parallel to the renter form's `RenterFieldConflict`). */
export interface PropertyFormFieldConflict {
  formKey: string; // e.g. 'houseCommittee'
  labelKey: string; // i18n label key
  existing: string; // stored value, as a display string
  scanned: string; // scanned lease value, as a display string
}

const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** Compare a scanned property prefill against the values an existing property was reset into
 *  (both RHF form keys) and split into silent `fills` (the existing field is blank) and
 *  user-resolved `conflicts` (both present but differing). Address match-key fields are excluded
 *  (they identify the property). Used by the property form when a scan attaches to an existing
 *  property, mirroring the renter form's `diffScannedRenter`. */
export function diffScannedPropertyForm(
  scanPrefill: Record<string, unknown> | undefined,
  existingValues: Record<string, unknown>,
): { fills: Record<string, string>; conflicts: PropertyFormFieldConflict[] } {
  const fills: Record<string, string> = {};
  const conflicts: PropertyFormFieldConflict[] = [];
  if (!scanPrefill) return { fills, conflicts };
  for (const f of PROPERTY_SCAN_FIELDS) {
    if (MATCH_KEY_FIELDS.has(f.field)) continue;
    const scanned = toStr(scanPrefill[f.key]).trim();
    if (!scanned) continue;
    const existingStr = toStr(existingValues[f.key]).trim();
    if (!existingStr) {
      fills[f.key] = scanned; // existing blank -> fill from scan
      continue;
    }
    if (scanned === existingStr) continue;
    conflicts.push({ formKey: f.key, labelKey: f.i18n, existing: existingStr, scanned });
  }
  return { fills, conflicts };
}
