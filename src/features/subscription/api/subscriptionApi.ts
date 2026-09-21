import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockSubscriptionApi } from '@/core/api/mock';
import type { Subscription } from '../types';

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
