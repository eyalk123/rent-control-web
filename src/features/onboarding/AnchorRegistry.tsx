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

export function AnchorRegistryProvider({ children }: PropsWithChildren) {
  const els = useRef(new Map<string, HTMLElement>());

  const register = useCallback((key: string, el: HTMLElement | null) => {
    if (el) els.current.set(key, el);
    else els.current.delete(key);
  }, []);

  const get = useCallback((key: string) => els.current.get(key) ?? null, []);

  const measure = useCallback((key: string): AnchorRect | null => {
    const el = els.current.get(key);
    if (!el?.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, []);

  // Both the expanded and collapsed sidebars can be mounted at once, so "registered"
  // is not the same as "visible". has() must agree with measure() or a tour will try to
  // point at a display:none element.
  const has = useCallback((key: string) => measure(key) !== null, [measure]);

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
