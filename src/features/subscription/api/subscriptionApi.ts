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
