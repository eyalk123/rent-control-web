/**
 * Onboarding — anchor registry (web).
 *
 * Phase 1 infrastructure, and the mirror of the mobile file of the same name. Inert:
 * renders nothing, draws nothing, reads no tour state. Its only job is to let a
 * component say "I am the element known as `nav.transactions`" so a later overlay can
 * measure where it is.
 *
 * Unlike mobile there is no wrapper component — the ref callback goes straight onto the
 * existing element, so anchoring adds no DOM.
 *
 * One key, several elements. The web chrome renders every navigation variant at once and
 * hides the ones that do not apply: the wide sidebar (`hidden 2xl:flex`), the icon
 * sidebar (`hidden lg:flex 2xl:hidden`) and the bottom bar (`lg:hidden`) all claim
 * `nav.home`, and all three are in the DOM at every width. A single-element map is
 * therefore wrong in a way that fails silently — whichever variant mounted last wins,
 * and on a desktop viewport that is the *hidden* icon sidebar, so the first-run tour
 * would find nothing to point at and quietly never open. Keeping a set per key and
 * resolving to the first *visible* member is what makes anchoring width-independent.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnchorRegistryValue {
  register: (key: string, el: HTMLElement | null) => void;
  /** The live element, for Radix Popover to anchor against. */
  get: (key: string) => HTMLElement | null;
  measure: (key: string) => AnchorRect | null;
  has: (key: string) => boolean;
}

const AnchorRegistryContext = createContext<AnchorRegistryValue | null>(null);

/**
 * A hidden element still reports a rect in some layouts (an ancestor with zero height,
 * `visibility: hidden`), so size alone is not enough. `checkVisibility` answers exactly
 * this question and is available in every browser we support; the rect test is the
 * fallback for the ones that lack it.
 */
function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (typeof el.checkVisibility === 'function') {
    if (!el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) {
      return false;
    }
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

export function AnchorRegistryProvider({ children }: PropsWithChildren) {
  const els = useRef(new Map<string, Set<HTMLElement>>());

  const register = useCallback((key: string, el: HTMLElement | null) => {
    if (!key) return;
    const set = els.current.get(key);
    if (el) {
      if (set) set.add(el);
      else els.current.set(key, new Set([el]));
      return;
    }
    // React calls the ref with null on unmount, but it does not tell us *which* element
    // is going away, so drop everything detached instead.
    if (!set) return;
    set.forEach((candidate) => {
      if (!candidate.isConnected) set.delete(candidate);
    });
    if (set.size === 0) els.current.delete(key);
  }, []);

  /** The visible claimant of this key, or null when every variant is hidden. */
  const resolve = useCallback((key: string): HTMLElement | null => {
    const set = els.current.get(key);
    if (!set) return null;
    let found: HTMLElement | null = null;
    set.forEach((el) => {
      if (!el.isConnected) {
        set.delete(el);
        return;
      }
      if (!found && isVisible(el)) found = el;
    });
    return found;
  }, []);

  const get = useCallback((key: string) => resolve(key), [resolve]);

  const measure = useCallback(
    (key: string): AnchorRect | null => {
      const el = resolve(key);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    [resolve],
  );

  // "Registered" is not the same as "visible", and has() must agree with measure() or a
  // tour will try to point at a display:none element.
  const has = useCallback((key: string) => resolve(key) !== null, [resolve]);

  const value = useMemo(() => ({ register, get, measure, has }), [register, get, measure, has]);

  return (
    <AnchorRegistryContext.Provider value={value}>{children}</AnchorRegistryContext.Provider>
  );
}

/** Null outside the provider rather than throwing — an anchored component rendered in
 *  isolation (a test, a route without the shell) must not crash. */
export function useAnchorRegistry(): AnchorRegistryValue | null {
  return useContext(AnchorRegistryContext);
}

/**
 * Ref callback to spread onto the element being anchored. Adds no wrapper.
 *
 *   const ref = useTourAnchor(ANCHORS.navTransactions);
 *   <NavLink ref={ref} ... />
 */
export function useTourAnchor(key: string) {
  const registry = useAnchorRegistry();
  return useCallback(
    (el: HTMLElement | null) => {
      registry?.register(key, el);
    },
    [registry, key],
  );
}
