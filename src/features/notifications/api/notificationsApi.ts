import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockNotificationsApi } from '@/core/api/mock';
import type { NotificationItem } from '../types';

export async function getNotifications(
  status: 'unread' | 'all' = 'all',
): Promise<NotificationItem[]> {
  if (USE_MOCK_API) return mockNotificationsApi.getNotifications(status);
  const { data } = await apiClient.get<NotificationItem[]>('/notifications', {
    params: { status },
  });
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  if (USE_MOCK_API) return mockNotificationsApi.markRead(id);
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK_API) return mockNotificationsApi.markAllRead();
  await apiClient.post('/notifications/read-all');
}

export async function dismissNotification(id: number): Promise<void> {
  if (USE_MOCK_API) return mockNotificationsApi.dismiss(id);
  await apiClient.post(`/notifications/${id}/dismiss`);
}
