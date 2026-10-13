import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockSubscriptionApi } from '@/core/api/mock';
import type { BillingPeriod } from '@/features/marketing/tiers';
import type { PlanId, Subscription } from '../types';

export async function getSubscription(): Promise<Subscription> {
  if (USE_MOCK_API) return mockSubscriptionApi.get();
  const { data } = await apiClient.get<Subscription>('/subscription');
  return data;
}

/** Record that the over-limit explanation has been shown. Called once, after showing it. */
export async function acknowledgeLockNotice(): Promise<void> {
  if (USE_MOCK_API) return mockSubscriptionApi.acknowledgeLockNotice();
  await apiClient.post('/subscription/lock-notice/ack');
}

/** Paddle's own cancel and update-payment pages. The links expire; fetch right before use. */
export interface ManageLinks {
  cancel_url: string | null;
  update_payment_method_url: string | null;
}

export async function getManageLinks(): Promise<ManageLinks> {
  if (USE_MOCK_API) return mockSubscriptionApi.getManageLinks();
  const { data } = await apiClient.get<ManageLinks>('/subscription/manage-links');
  return data;
}

/** Switch a web subscription's plan or period; the difference is charged or credited now. */
export async function changePlan(plan: Exclude<PlanId, 'free'>, period: BillingPeriod): Promise<Subscription> {
  if (USE_MOCK_API) return mockSubscriptionApi.changePlan(plan);
  const { data } = await apiClient.post<Subscription>('/subscription/change-plan', { plan, period });
  return data;
}

/**
 * What a discount code gives, from `GET /subscription/discount`. Mirrors `DiscountLookup` in
 * the backend's `app/schemas/subscription.py`. Web only — the apps sell through the stores,
 * whose offer codes never reach us — so it lives here rather than in the shared `types.ts`.
 */
export interface DiscountLookup {
  code: string;
  valid: boolean;
  reason: 'not_found' | 'expired' | 'used_up' | 'not_applicable' | null;
  /** `dsc_…`, handed to Paddle's price preview so the cards show what checkout will charge. */
  discount_id: string | null;
  type: 'percentage' | 'flat' | null;
  /** A percentage ("20"), or a flat amount in minor units of `currency_code` ("500"). */
  amount: string | null;
  currency_code: string | null;
  /** False: the first payment only. True: `maximum_recurring_intervals` payments, or all. */
  recur: boolean;
  maximum_recurring_intervals: number | null;
  expires_at: string | null;
  /** `<plan>_<period>` keys the code covers; null means every plan. */
  plans: string[] | null;
}

export async function lookupDiscount(code: string): Promise<DiscountLookup> {
  if (USE_MOCK_API) return mockSubscriptionApi.lookupDiscount(code);
  const { data } = await apiClient.get<DiscountLookup>('/subscription/discount', { params: { code } });
  return data;
}
