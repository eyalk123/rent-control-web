/**
 * Subscription tiers, as shown on the public pricing page.
 *
 * DISPLAY ONLY. These prices exist so a logged-out visitor — and a Paddle underwriter, and
 * Apple's reviewer — can see what the product costs. They are not what anyone is charged:
 * the real amounts live in App Store Connect, Play Console and Paddle, each of which sets
 * its own per-storefront price and collects tax its own way. Once a subscription exists,
 * every price shown inside the product comes from the store that sold it, never from here.
 *
 * The boundaries are total and non-overlapping on purpose. An earlier draft had 8 in both
 * the second and third band and 15 in both the third and fourth, which gives the server-side
 * gate two valid answers for one account. `min`/`max` here must stay in step with
 * `entitlement_service` in the backend, which is the only thing that actually enforces them.
 */

import type { PlanId } from '@/features/subscription/types';

export type BillingPeriod = 'monthly' | 'yearly';

export interface Tier {
  /** Stable key — also the i18n key suffix and the store product id stem. */
  id: 'free' | 'tier1' | 'tier2' | 'tier3';
  /** The backend's plan identifier for this band — what `GET /subscription` reports. */
  plan: PlanId;
  /** Inclusive lower bound on property count. */
  min: number;
  /** Inclusive upper bound, or null for the open-ended top band. */
  max: number | null;
  /** USD. null means free. */
  monthly: number | null;
  /** USD billed once a year. null means free. */
  yearly: number | null;
}

export const TIERS: Tier[] = [
  { id: 'free', plan: 'free', min: 1, max: 2, monthly: null, yearly: null },
  { id: 'tier1', plan: 'tier_3_8', min: 3, max: 8, monthly: 15, yearly: 150 },
  { id: 'tier2', plan: 'tier_9_15', min: 9, max: 15, monthly: 20, yearly: 200 },
  { id: 'tier3', plan: 'tier_16_plus', min: 16, max: null, monthly: 25, yearly: 250 },
];

export const PAID_TIERS = TIERS.filter((t) => t.monthly !== null);

/** What a yearly plan works out to per month, for the comparison line. */
export function monthlyEquivalent(tier: Tier): number | null {
  return tier.yearly === null ? null : Math.round((tier.yearly / 12) * 100) / 100;
}

/** Whole-percent saving of yearly over twelve monthly payments. */
export function yearlySavingPercent(tier: Tier): number | null {
  if (tier.monthly === null || tier.yearly === null) return null;
  return Math.round((1 - tier.yearly / (tier.monthly * 12)) * 100);
}

/** "3–8" / "16+" — the property-count band, formatted for display. */
export function bandLabel(tier: Tier, plus: string): string {
  return tier.max === null ? `${tier.min}${plus}` : `${tier.min}–${tier.max}`;
}
