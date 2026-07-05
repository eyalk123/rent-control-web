import type { Property } from '@/shared/types';

export type PropertyMatchStatus = 'matched' | 'none';

interface AddressLike {
  address?: string | null;
  city?: string | null;
}

/** Normalize an address/city fragment for loose comparison: lowercase, drop everything that
 *  isn't a letter or number (spaces, punctuation, RTL marks). Works for Hebrew and English. */
function norm(value?: string | null): string {
  return (value ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');
}

/** True if two places look like the same address — normalized street matches (either contains
 *  the other) and cities don't actively conflict. Used both for matching and the mismatch hint. */
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

/** Indices of scanned renters that already exist on the matched property. Empty when the
 *  property itself didn't match (a renter can't be a duplicate without a duplicate property). */
export function findDuplicateRenterIndices(
  scannedRenters: ScannedRenterLike[],
  matchedPropertyId: number | null,
  existingRenters: ExistingRenterLike[],
): Set<number> {
  const dup = new Set<number>();
  if (matchedPropertyId == null) return dup;
  const onProperty = existingRenters.filter((r) => r.property_id === matchedPropertyId);
  scannedRenters.forEach((s, i) => {
    if (onProperty.some((e) => renterNameMatches(s.prefill, e))) dup.add(i);
  });
  return dup;
}
