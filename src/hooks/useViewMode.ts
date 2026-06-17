import { useCallback, useState } from 'react';

export type ViewMode = 'card' | 'table';

/**
 * Per-list view preference (cards vs table), persisted to localStorage so each
 * list remembers its own choice across navigation and sessions — mirroring how
 * the app language is stored under `app_language`. Pass a stable, list-specific
 * `key` (e.g. 'properties', 'renters') so the lists don't share a value.
 */
export function useViewMode(key: string): [ViewMode, (next: ViewMode) => void] {
  const storageKey = `app_list_view:${key}`;

  const [view, setViewState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === 'table' || stored === 'card' ? stored : 'card';
  });

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore (e.g. private mode) */
    }
  }, [storageKey]);

  return [view, setView];
}
