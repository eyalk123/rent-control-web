import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EMPTY_TOUR_STATE,
  getTourState,
  patchTourState,
  type TourState,
  type TourStatePatch,
} from './api/tourState';

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
