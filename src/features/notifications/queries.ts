import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dismissNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notificationsApi';
import {
  createRule,
  deleteRule,
  getPreferences,
  previewRule,
  updateRule,
  updateSettings,
} from './api/preferencesApi';
import type { NotificationRuleDraft, NotificationSettings } from './types';

export const notificationKeys = {
  feed: ['notifications', 'feed'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

// ── feed ──────────────────────────────────────────────────────────────────

export function useNotifications(status: 'unread' | 'all' = 'all') {
  return useQuery({
    queryKey: [...notificationKeys.feed, status],
    queryFn: () => getNotifications(status),
  });
}

function useFeedInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: notificationKeys.feed });
}

export function useMarkNotificationRead() {
  const invalidate = useFeedInvalidation();
  return useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useFeedInvalidation();
  return useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
}

export function useDismissNotification() {
  const invalidate = useFeedInvalidation();
  return useMutation({ mutationFn: dismissNotification, onSuccess: invalidate });
}

// ── preferences + rules ─────────────────────────────────────────────────────

export function usePreferences() {
  return useQuery({ queryKey: notificationKeys.preferences, queryFn: getPreferences });
}

function usePreferencesInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: notificationKeys.preferences });
    // Rule/settings changes alter what the feed surfaces.
    qc.invalidateQueries({ queryKey: notificationKeys.feed });
  };
}

export function useUpdateSettings() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) => updateSettings(patch),
    onSuccess: invalidate,
  });
}

export function useCreateRule() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({
    mutationFn: (draft: NotificationRuleDraft) => createRule(draft),
    onSuccess: invalidate,
  });
}

export function useUpdateRule() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<NotificationRuleDraft> }) =>
      updateRule(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteRule() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({ mutationFn: deleteRule, onSuccess: invalidate });
}

// Imperative preview (called debounced from the editor), not a cached query.
export { previewRule };
