/**
 * Onboarding — the tour controller (web).
 *
 * Owns *which* tour is running and *where* in it we are. It renders no UI; TourOverlay
 * draws whatever this exposes. The split is deliberate and is what let the mobile logic
 * come across intact while the renderer was replaced wholesale.
 *
 * A tour opens only when all of these hold:
 *   1. tour state has loaded (never guess and replay something already dismissed);
 *   2. tours are not disabled;
 *   3. this tour has not been seen;
 *   4. its gate passes — see useGates for why a failing gate defers rather than consumes;
 *   5. every anchored step it needs is actually mounted *and visible*;
 *   6. every `skipWhen` gate it carries can be answered, so a step is not kept or dropped
 *      on a guess made before the lists have loaded.
 *
 * (5) carries more weight on web than it did on mobile. The chrome renders all three
 * navigation variants at once and hides two of them with breakpoint classes, and a lazy
 * route's content arrives after its shell, so "the component exists" and "the user can
 * see it" are different questions. The registry answers the second one.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAnchorRegistry } from './AnchorRegistry';
import { useTourProgress } from './queries';
import { TOURS } from './registry';
import { TOURS_ENABLED } from './flags';
import { useGates, useGateKnown, type GateInputs } from './useGates';
import type { SeedId, TourDefinition, TourId, TourStep } from './types';

/** How long to wait for a page's anchors to mount before giving up on this visit. */
const ANCHOR_WAIT_MS = 1200;
const ANCHOR_POLL_MS = 120;

interface ActiveTour {
  tour: TourDefinition;
  stepIndex: number;
  /** Set when the tour was opened by acting on a seed — drives the callback line. */
  arrivedFrom: SeedId | null;
}

interface TourControllerValue {
  active: ActiveTour | null;
  step: TourStep | null;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
  skip: () => void;
  /**
   * Asks for a tour. Safe to call on every render of a page — it self-suppresses once
   * the tour has run, is running, or has already been declined this session.
   */
  requestTour: (id: TourId, inputs?: GateInputs) => void;
}

const TourControllerContext = createContext<TourControllerValue | null>(null);

export function TourControllerProvider({ children }: PropsWithChildren) {
  const registry = useAnchorRegistry();
  const progress = useTourProgress();
  const evaluateGate = useGates();
  const isGateKnown = useGateKnown();
  const { pathname } = useLocation();
  // The anchor wait polls from a closure created when the tour was requested, so reading
  // the gates directly would freeze them at the values they had before the lists loaded —
  // which is exactly the moment a `skipWhen` step needs an answer. Kept current on every
  // render, the same way the anchor registry reads through a ref.
  const gatesRef = useRef({ evaluateGate, isGateKnown });
  useEffect(() => {
    gatesRef.current = { evaluateGate, isGateKnown };
  }, [evaluateGate, isGateKnown]);
  const [active, setActive] = useState<ActiveTour | null>(null);
  // Tours already considered and rejected this session, so a page that re-renders
  // constantly does not re-run the whole check each time.
  const declined = useRef(new Set<TourId>());
  const openingRef = useRef<TourId | null>(null);

  // TOURS_ENABLED is the master switch (see flags.ts). It is checked here as well as
  // on the query because this is the single place a tour can be opened from, so one
  // false here is a hard guarantee that nothing appears.
  const canRun = TOURS_ENABLED && progress.ready && !progress.toursDisabled;

  /** Waits for the anchors a tour needs, then opens it. */
  const openWhenAnchored = useCallback(
    (tour: TourDefinition, arrivedFrom: SeedId | null) => {
      const deadline = Date.now() + ANCHOR_WAIT_MS;
      const conditional = tour.steps.filter((s) => s.skipWhen);

      const attempt = () => {
        // Bail if the wait was cancelled meanwhile — a navigation, or a sign-out.
        if (openingRef.current !== tour.id) return;

        const { evaluateGate: gate, isGateKnown: known } = gatesRef.current;

        // A step whose `skipWhen` gate has passed is not part of this tour at all — the
        // closing "start with one property" card once there is a portfolio. Resolved
        // first, so it counts for neither the wait nor the step counter.
        const live = tour.steps.filter((s) => !s.skipWhen || !gate(s.skipWhen));

        // Excluded from the wait, for opposite reasons. An optional step's element may
        // legitimately be absent, and waiting on one would suppress the entire tour; a
        // `revealsAnchor` step's element is absent by definition until the step is reached,
        // because reaching it is what creates it.
        const needed = live
          .filter((s) => !s.optional && !s.revealsAnchor)
          .map((s) => s.anchor)
          .filter((a): a is string => Boolean(a));

        // Hold while a conditional step's gate is still unanswerable, so the tour does not
        // open against a guess. Past the deadline it opens anyway with the step kept,
        // which is the right way to be wrong: a new account must not lose the one
        // instruction written for it.
        const ready = conditional.every((s) => known(s.skipWhen!)) || Date.now() >= deadline;

        if (ready && needed.every((key) => registry?.has(key))) {
          // Resolve optional steps once, here: a step whose element is not on screen at
          // the moment the tour opens is dropped, so the step counter stays truthful
          // rather than promising a step that will never render.
          // Only `optional` is resolved here. A `revealsAnchor` step is kept whatever the
          // registry says right now — its element arrives later, on purpose.
          const steps = live.filter(
            (s) => !s.optional || (s.anchor != null && Boolean(registry?.has(s.anchor))),
          );
          setActive({
            tour: steps.length === tour.steps.length ? tour : { ...tour, steps },
            stepIndex: 0,
            arrivedFrom,
          });
          openingRef.current = null;
          return;
        }
        if (Date.now() >= deadline) {
          // Never mounted in time. Leave the tour unseen so it gets another chance on
          // the next visit rather than being silently burned.
          openingRef.current = null;
          return;
        }
        window.setTimeout(attempt, ANCHOR_POLL_MS);
      };

      // Yield once before the first look: a lazy route has just swapped its Suspense
      // fallback for real content, and asking in the same tick reads the fallback.
      //
      // A timeout rather than an animation frame, deliberately. `requestAnimationFrame`
      // only runs when the browser is producing frames, so in a tab that is backgrounded
      // or otherwise throttled the callback simply never fires and the tour silently
      // never opens. The retry loop below covers the case where this first look is still
      // too early anyway.
      window.setTimeout(attempt, 0);
    },
    [registry],
  );

  /**
   * Deliberately *not* memoised against a ref. Its identity changes whenever the gate
   * inputs change, and that is the retry mechanism: a page that mounts before its list
   * has loaded asks once and is refused, then the data lands, `evaluateGate` is rebuilt,
   * and the effect in `useTour` re-runs and asks again — now with an answer. A stable
   * callback would have needed a polling timer to achieve the same thing.
   */
  const requestTour = useCallback(
    (id: TourId, inputs: GateInputs = {}) => {
      if (!canRun || openingRef.current) return;
      if (declined.current.has(id)) return;

      const tour = (TOURS as Partial<Record<TourId, TourDefinition>>)[id];
      if (!tour) return;
      if (progress.hasSeenTour(id)) return;

      if (!evaluateGate(tour.gate, inputs)) {
        // Gate failed: do NOT mark declined — the whole point is that it retries once the
        // page has something worth explaining.
        return;
      }

      openingRef.current = id;
      const arrivedFrom =
        tour.arrivesFrom && progress.hasShownSeed(tour.arrivesFrom) ? tour.arrivesFrom : null;
      openWhenAnchored(tour, arrivedFrom);
    },
    [canRun, progress, evaluateGate, openWhenAnchored],
  );

  const completeTour = progress.completeTour;
  const finish = useCallback(
    (tour: TourDefinition) => {
      // Every seed the tour displays is recorded alongside it, so the destination tour
      // can open with its callback line later — and so a seed is never shown twice.
      const seeds: SeedId[] = [];
      tour.steps.forEach((s) => {
        if (s.seed) seeds.push(s.seed.id);
      });
      completeTour(tour.id, seeds);
    },
    [completeTour],
  );

  const next = useCallback(() => {
    setActive((prev) => {
      if (!prev) return null;
      if (prev.stepIndex >= prev.tour.steps.length - 1) {
        finish(prev.tour);
        return null;
      }
      return { ...prev, stepIndex: prev.stepIndex + 1 };
    });
  }, [finish]);

  const back = useCallback(() => {
    setActive((prev) =>
      prev && prev.stepIndex > 0 ? { ...prev, stepIndex: prev.stepIndex - 1 } : prev,
    );
  }, []);

  const skip = useCallback(() => {
    setActive((prev) => {
      if (!prev) return null;
      // Skipping still counts as seen. Re-offering a tour someone actively dismissed is
      // the fastest way to make the whole feature feel like nagging.
      finish(prev.tour);
      declined.current.add(prev.tour.id);
      return null;
    });
  }, [finish]);

  // Navigating away closes the tour without consuming it. Its steps describe a page that
  // is no longer there, and the anchors they point at have moved or gone. Leaving it
  // unseen means the user meets it again on their next visit, from the top, which is the
  // only version of it that reads coherently.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    openingRef.current = null;
    setActive(null);
  }, [pathname]);

  // A tour must not outlive a sign-out.
  useEffect(() => {
    if (!canRun) {
      setActive(null);
      openingRef.current = null;
    }
  }, [canRun]);

  const value = useMemo<TourControllerValue>(() => {
    const step = active ? active.tour.steps[active.stepIndex] : null;
    return {
      active,
      step,
      isFirst: active ? active.stepIndex === 0 : false,
      isLast: active ? active.stepIndex === active.tour.steps.length - 1 : false,
      next,
      back,
      skip,
      requestTour,
    };
  }, [active, next, back, skip, requestTour]);

  return (
    <TourControllerContext.Provider value={value}>{children}</TourControllerContext.Provider>
  );
}

export function useTourController(): TourControllerValue | null {
  return useContext(TourControllerContext);
}

/**
 * Page-level entry point: asks for a tour whenever the page is mounted and its inputs
 * change. Suppression lives in the controller, so calling this unconditionally is correct.
 *
 *   useTour('transactions-list');
 *
 * It asks again whenever `requestTour` is rebuilt, which happens exactly when the gate
 * inputs change. That covers the case a fixed one-shot call would miss: a page that
 * mounts before its list has loaded, is refused because the cache is still empty, and
 * becomes eligible a few hundred milliseconds later.
 */
export function useTour(id: TourId, inputs: GateInputs = {}) {
  const controller = useTourController();
  const request = controller?.requestTour;
  const rentMode = inputs.rentMode ?? null;

  useEffect(() => {
    request?.(id, { rentMode });
  }, [request, id, rentMode]);
}

/**
 * The step currently showing for `tourId`, or null when that tour is not running.
 *
 * This is how a screen *reacts* to a step without the registry growing side effects. The
 * registry stays what it is — a description of what to say and where to point — and the
 * behaviour lives in the component that already owns the state being touched:
 *
 *   - Properties and Renters switch their list to table view for the step that explains
 *     the table, so the mode is demonstrated rather than described;
 *   - AppShell opens the alerts panel for the step that points at a control inside it.
 *
 * Whatever a screen does here it must undo: this returns null the moment the tour ends, so
 * derive from it rather than writing state, and the screen goes back to how the user left
 * it with no cleanup to forget.
 */
export function useTourStep(tourId: TourId): string | null {
  const controller = useTourController();
  if (!controller?.active || controller.active.tour.id !== tourId) return null;
  return controller.step?.id ?? null;
}
