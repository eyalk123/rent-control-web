import { useLocation, useSearchParams } from 'react-router-dom';

/** Origin carried on navigation state so a detail page's back link can return there. */
export interface DetailBackState {
  /** Where the back link should navigate (falls back to the page's list route). */
  backTo?: string;
  /** Human label for that origin (e.g. a property address or a renter name). */
  backLabel?: string;
}

/**
 * Detail-page plumbing shared by the renter and property pages: the origin read off
 * navigation state, plus the active tab kept in `?tab=` so the browser back button and a
 * refresh restore the tab the user was on.
 *
 * `setSearchParams` forwards only the options it is given, so the tab change has to re-send
 * `state` explicitly — otherwise the replaced history entry gets `state: null` and the back
 * link silently degrades to the generic list.
 */
export function useDetailBackTarget<T extends string>(tabIds: readonly T[], defaultTab: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const backState = location.state as DetailBackState | null;

  const tabParam = searchParams.get('tab') as T | null;
  const tab: T = tabParam && tabIds.includes(tabParam) ? tabParam : defaultTab;

  const setTab = (id: T) =>
    setSearchParams(
      (prev) => {
        prev.set('tab', id);
        return prev;
      },
      { replace: true, state: location.state, preventScrollReset: true },
    );

  return { backState, tab, setTab, searchParams, setSearchParams, location };
}

/**
 * A single piece of tab-local UI state kept in the query string, so switching detail tabs —
 * which unmounts the panel — does not throw it away, and a refresh or the back button
 * restores it.
 *
 * Writes go through the same replace + re-send-`state` shape as `setTab` above, for the same
 * reason: dropping `state` would silently degrade the back link. Setting a value equal to
 * `fallback` removes the param rather than writing a redundant one, so a page left on its
 * defaults keeps a clean URL.
 */
export function useDetailParam<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const raw = searchParams.get(key) as T | null;
  const value: T = raw != null && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const setValue = (next: T) =>
    setSearchParams(
      (prev) => {
        if (next === fallback) prev.delete(key);
        else prev.set(key, next);
        return prev;
      },
      { replace: true, state: location.state, preventScrollReset: true },
    );

  return [value, setValue];
}
