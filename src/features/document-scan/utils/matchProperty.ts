import type { Property } from '@/shared/types';

export type PropertyMatchStatus = 'matched' | 'none';

interface AddressLike {
  address?: string | null;
  city?: string | null;
  floor?: string | number | null;
  apartment?: string | null;
}

/** Normalize an address fragment for loose comparison: lowercase, drop everything that isn't a
 *  letter or number (spaces, punctuation, RTL marks). Coerces numbers (e.g. floor). Works for
 *  Hebrew and English. */
function norm(value?: string | number | null): string {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');
}

/** True if two places look like the same address. Floor and apartment are part of the address
 *  (like city): the same street+city but a different unit is a *different* property. Street must
 *  match (either contains the other); city rejects only when both sides give conflicting values.
 *  The unit (floor/apartment) is strict: if one side names a unit and the other names none it's a
 *  non-match, and any unit field both sides give must match exactly. Used for matching and the
 *  mismatch hint. */
export function addressesMatch(a: AddressLike, b: AddressLike): boolean {
  const aAddr = norm(a.address);
  const bAddr = norm(b.address);
  if (!aAddr || !bAddr) return false;
  if (!(aAddr === bAddr || aAddr.includes(bAddr) || bAddr.includes(aAddr))) return false;

  const aCity = norm(a.city);
  const bCity = norm(b.city);
  if (aCity && bCity && aCity !== bCity && !aCity.includes(bCity) && !bCity.includes(aCity)) {
    return false;
  }

  // Unit identity (floor/apartment). Strict: if one place names a unit and the other names none,
  // it's a different property; and any unit field both sides give must match exactly (not
  // substring — "5" must not match "15").
  const aApt = norm(a.apartment);
  const bApt = norm(b.apartment);
  const aFloor = norm(a.floor);
  const bFloor = norm(b.floor);
  if (!!(aApt || aFloor) !== !!(bApt || bFloor)) return false;
  if (aApt && bApt && aApt !== bApt) return false;
  if (aFloor && bFloor && aFloor !== bFloor) return false;

  return true;
}

/** Find the existing property a scanned lease refers to. Only a single unambiguous address
 *  match is treated as confident; anything else returns `none` so the user picks manually. */
export function matchProperty(
  scanned: AddressLike | undefined,
  properties: Property[],
): { propertyId: number | null; status: PropertyMatchStatus } {
  if (!scanned?.address) return { propertyId: null, status: 'none' };
  const matches = properties.filter((p) => addressesMatch(p, scanned));
  if (matches.length === 1) return { propertyId: matches[0].id, status: 'matched' };
  return { propertyId: null, status: 'none' };
}

interface ScannedRenterLike {
  prefill: { firstName?: string | null; lastName?: string | null };
}
interface ExistingRenterLike {
  id: number;
  property_id: number | null;
  first_name?: string | null;
  last_name?: string | null;
}

/** Duplicate renter = same normalized first+last name. Full-name-only match; empty names
 *  never match. Renters can only duplicate within an already-matched property. */
export function renterNameMatches(
  scanned: ScannedRenterLike['prefill'],
  existing: Pick<ExistingRenterLike, 'first_name' | 'last_name'>,
): boolean {
  const a = norm(scanned.firstName) + norm(scanned.lastName);
  const b = norm(existing.first_name) + norm(existing.last_name);
  return !!a && !!b && a === b;
}

/** Map of scanned-renter index -> matched existing renter id, for scanned renters that already
 *  exist on the matched property. Empty when the property itself didn't match (a renter can't be
 *  a duplicate without a duplicate property). `Map.has(i)` keeps the badge/checkbox call sites
 *  working; the continue handler additionally reads `.get(i)` to attach the existing renter id. */
export function findDuplicateRenterMatches(
  scannedRenters: ScannedRenterLike[],
  matchedPropertyId: number | null,
  existingRenters: ExistingRenterLike[],
): Map<number, number> {
  const dup = new Map<number, number>();
  if (matchedPropertyId == null) return dup;
  const onProperty = existingRenters.filter((r) => r.property_id === matchedPropertyId);
  scannedRenters.forEach((s, i) => {
    const match = onProperty.find((e) => renterNameMatches(s.prefill, e));
    if (match) dup.set(i, match.id);
  });
  return dup;
}
