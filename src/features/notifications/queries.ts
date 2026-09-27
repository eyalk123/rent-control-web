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
import type { NotificationPreferences, NotificationRuleDraft, NotificationSettings } from './types';

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

/**
 * Writes the change into the cached preferences before the request goes out, so a switch
 * moves when it is clicked rather than when the refetch lands. The refetch afterwards
 * (success or failure) replaces the guess with what the server actually holds.
 */
function useOptimisticPreferences<V>(
  mutationFn: (vars: V) => Promise<unknown>,
  apply: (prefs: NotificationPreferences, vars: V) => NotificationPreferences,
) {
  const qc = useQueryClient();
  const invalidate = usePreferencesInvalidation();
  return useMutation({
    mutationFn,
    onMutate: async (vars: V) => {
      await qc.cancelQueries({ queryKey: notificationKeys.preferences });
      qc.setQueryData<NotificationPreferences>(notificationKeys.preferences, (prev) => (prev ? apply(prev, vars) : prev));
    },
    onSettled: invalidate,
  });
}

export function useUpdateSettings() {
  return useOptimisticPreferences(
    (patch: Partial<NotificationSettings>) => updateSettings(patch),
    (prefs, patch) => ({ ...prefs, settings: { ...prefs.settings, ...patch } }),
  );
}

export function useCreateRule() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({
    mutationFn: (draft: NotificationRuleDraft) => createRule(draft),
    onSuccess: invalidate,
  });
}

export function useUpdateRule() {
  return useOptimisticPreferences(
    ({ id, patch }: { id: number; patch: Partial<NotificationRuleDraft> }) => updateRule(id, patch),
    (prefs, { id, patch }) => ({ ...prefs, rules: prefs.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
  );
}

export function useDeleteRule() {
  const invalidate = usePreferencesInvalidation();
  return useMutation({ mutationFn: deleteRule, onSuccess: invalidate });
}

// Imperative preview (called debounced from the editor), not a cached query.
export { previewRule };
