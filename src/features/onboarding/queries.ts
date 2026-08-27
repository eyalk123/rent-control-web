import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EMPTY_TOUR_STATE,
  getTourState,
  patchTourState,
  type TourState,
  type TourStatePatch,
} from './api/tourState';
import { TOURS_ENABLED } from './flags';
import type { SeedId, TourId } from './types';

export const tourStateKeys = {
  all: ['tour-state'] as const,
};

/**
 * Onboarding progress for the signed-in account.
 *
 * Long-lived on purpose: this changes only when the user finishes a tour, and every
 * mutation writes the fresh server copy straight back into the cache. Failing to load it
 * must never block a screen — the fallback is "seen everything", so a network problem
 * shows no tours rather than replaying tours the user already dismissed.
 */
export function useTourState() {
  const query = useQuery({
    queryKey: tourStateKeys.all,
    queryFn: getTourState,
    // With the master switch off this never runs, so a build with tours disabled makes
    // no onboarding request at all. `ready` then stays false, which is itself enough to
    // keep every tour shut.
    enabled: TOURS_ENABLED,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  return {
    ...query,
    state: query.data ?? EMPTY_TOUR_STATE,
    /** Until it has loaded, no tour may run — better silent than repeated. */
    ready: query.isSuccess,
  };
}

/**
 * Records a finished tour or a shown seed.
 *
 * Optimistic, and deliberately not rolled back on failure: if the write is lost, the
 * worst case is the user sees the tour once more on another device. Rolling back would
 * instead risk showing it again in *this* session, immediately, which is the more
 * annoying failure.
 */
export function useRecordTourProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: TourStatePatch) => patchTourState(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: tourStateKeys.all });
      const previous = qc.getQueryData<TourState>(tourStateKeys.all) ?? EMPTY_TOUR_STATE;
      const now = new Date().toISOString();
      const next: TourState = {
        toursSeen: { ...previous.toursSeen },
        seedsShown: { ...previous.seedsShown },
        toursDisabled: patch.toursDisabled ?? previous.toursDisabled,
      };
      if (patch.reset) {
        next.toursSeen = {};
        next.seedsShown = {};
      }
      // setdefault, matching the server: first sighting wins.
      patch.toursSeen?.forEach((id) => {
        next.toursSeen[id] ??= now;
      });
      patch.seedsShown?.forEach((id) => {
        next.seedsShown[id] ??= now;
      });
      qc.setQueryData(tourStateKeys.all, next);
      return { previous };
    },
    onSuccess: (server) => {
      // Null = no server (mock/e2e mode); the optimistic cache is the only truth there.
      if (server) qc.setQueryData(tourStateKeys.all, server);
    },
  });
}

/**
 * The shape the tour controller actually wants: "may a tour run", "has this one run",
 * and one call to record a finished tour together with every seed it displayed.
 *
 * Mobile debounces those marks because they arrive as a burst of separate calls; here
 * the controller already knows the whole set at the moment a tour ends, so it is one
 * patch and needs no timer.
 */
export function useTourProgress() {
  const { state, ready } = useTourState();
  const record = useRecordTourProgress();
  const mutate = record.mutate;

  const completeTour = useCallback(
    (tourId: TourId, seedsShown: SeedId[]) => {
      mutate({ toursSeen: [tourId], seedsShown });
    },
    [mutate],
  );

  return useMemo(
    () => ({
      /** Until this is true, no tour may run — better silent than repeated. */
      ready,
      toursDisabled: state.toursDisabled,
      /** Nothing has ever been seen: a new account, or one that just reset. */
      nothingSeen: Object.keys(state.toursSeen).length === 0,
      hasSeenTour: (id: TourId) => Boolean(state.toursSeen[id]),
      hasShownSeed: (id: SeedId) => Boolean(state.seedsShown[id]),
      completeTour,
    }),
    [ready, state, completeTour],
  );
}
