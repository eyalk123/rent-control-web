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
