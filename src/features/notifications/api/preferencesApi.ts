import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockPreferencesApi } from '@/core/api/mock';
import type {
  NotificationPreferences,
  NotificationRule,
  NotificationRuleDraft,
  NotificationSettings,
  RulePreview,
} from '../types';

export async function getPreferences(): Promise<NotificationPreferences> {
  if (USE_MOCK_API) return mockPreferencesApi.getPreferences();
  const { data } = await apiClient.get<NotificationPreferences>('/notification-preferences');
  return data;
}

export async function updateSettings(
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  if (USE_MOCK_API) return mockPreferencesApi.updateSettings(patch);
  const { data } = await apiClient.put<NotificationSettings>(
    '/notification-preferences/settings',
    patch,
  );
  return data;
}

export async function createRule(draft: NotificationRuleDraft): Promise<NotificationRule> {
  if (USE_MOCK_API) return mockPreferencesApi.createRule(draft);
  const { data } = await apiClient.post<NotificationRule>('/notification-rules', draft);
  return data;
}

export async function updateRule(
  id: number,
  patch: Partial<NotificationRuleDraft>,
): Promise<NotificationRule> {
  if (USE_MOCK_API) return mockPreferencesApi.updateRule(id, patch);
  const { data } = await apiClient.patch<NotificationRule>(`/notification-rules/${id}`, patch);
  return data;
}

export async function deleteRule(id: number): Promise<void> {
  if (USE_MOCK_API) return mockPreferencesApi.deleteRule(id);
  await apiClient.delete(`/notification-rules/${id}`);
}

export async function previewRule(draft: NotificationRuleDraft): Promise<RulePreview> {
  if (USE_MOCK_API) return mockPreferencesApi.previewRule(draft);
  const { data } = await apiClient.post<RulePreview>('/notification-rules/preview', draft);
  return data;
}
