import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * State that survives navigation by persisting to Web Storage (sessionStorage by
 * default, so it clears when the tab closes). Mirrors the localStorage idiom in
 * `useViewMode` but is generic and JSON-serialised like the accessibility
 * settings — use it for list filters, sort order, etc.
 *
 * Pass `key: null` to opt out of persistence entirely (the hook then behaves like
 * plain `useState`), which lets callers decide at runtime whether to persist while
 * still calling the hook unconditionally (Rules of Hooks).
 */
export function usePersistedState<T>(
  key: string | null,
  initial: T,
  storage: Storage = sessionStorage,
): [T, Dispatch<SetStateAction<T>>] {
  // Read once, lazily. If persistence is off or the read/parse fails, use `initial`.
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial;
    try {
      const stored = storage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });

  // Resolve inside the state updater so a functional update (as TanStack Table
  // passes) sees the latest value, then persist the result as a side effect.
  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        if (key) {
          try {
            storage.setItem(key, JSON.stringify(resolved));
          } catch {
            /* ignore (e.g. private mode or quota) */
          }
        }
        return resolved;
      });
    },
    [key, storage],
  );

  return [value, set];
}
