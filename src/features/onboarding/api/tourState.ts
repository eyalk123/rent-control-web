import apiClient from '@/core/api/client';
import { USE_MOCK_API } from '@/core/api/mock';
import type { SeedId, TourId } from '../types';

/**
 * Onboarding progress, stored on the account rather than in this browser.
 *
 * The two maps are separate on purpose: `seedsShown` records that a feature was *named*
 * somewhere the user could see it, `toursSeen` that it was actually *explained*. Showing
 * a seed must never consume its destination tour.
 */
export interface TourState {
  toursSeen: Partial<Record<TourId, string>>;
  seedsShown: Partial<Record<SeedId, string>>;
  toursDisabled: boolean;
}

interface TourStateDto {
  tours_seen: Record<string, string>;
  seeds_shown: Record<string, string>;
  tours_disabled: boolean;
}

export const EMPTY_TOUR_STATE: TourState = {
  toursSeen: {},
  seedsShown: {},
  toursDisabled: false,
};

function fromDto(dto: TourStateDto): TourState {
  return {
    toursSeen: (dto.tours_seen ?? {}) as TourState['toursSeen'],
    seedsShown: (dto.seeds_shown ?? {}) as TourState['seedsShown'],
    toursDisabled: Boolean(dto.tours_disabled),
  };
}

/**
 * Under Playwright, tours are off unless a spec asks for them.
 *
 * Not squeamishness about testing the feature — `e2e/onboarding.spec.ts` opts in and
 * drives the whole thing. It is that the first-run tour is a modal overlay on `/home`,
 * so leaving it armed would put a click-blocking scrim in front of every unrelated spec
 * in the suite and couple all of them to onboarding copy. The opt-in is a localStorage
 * key so a spec can set it in `addInitScript`, before any app code runs.
 */
const E2E = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true';
export const E2E_TOURS_KEY = 'onboarding.e2eTours';

function e2eSuppressed(): boolean {
  if (!E2E) return false;
  try {
    return localStorage.getItem(E2E_TOURS_KEY) !== 'on';
  } catch {
    return true;
  }
}

/** Mock mode has no server, and an offline UI session should simply see no tours. */
export async function getTourState(): Promise<TourState> {
  if (e2eSuppressed()) return { ...EMPTY_TOUR_STATE, toursDisabled: true };
  if (USE_MOCK_API) return EMPTY_TOUR_STATE;
  const response = await apiClient.get<TourStateDto>('/users/me/tour-state');
  return fromDto(response.data);
}

export interface TourStatePatch {
  /** Tours that just finished. */
  toursSeen?: TourId[];
  /** Seeds that were just displayed. */
  seedsShown?: SeedId[];
  toursDisabled?: boolean;
  /** Clears both maps — the "Show tours again" control in Settings. */
  reset?: boolean;
}

/**
 * A patch, not a replacement: the server merges. The same account is routinely open on a
 * phone and a browser, and replacing would let whichever wrote last drop the other's
 * progress.
 */
export async function patchTourState(patch: TourStatePatch): Promise<TourState | null> {
  // Null means "no server answered" — the caller must keep its optimistic state rather
  // than overwrite it. Returning EMPTY here wiped the just-recorded "seen" mark and the
  // finished tour immediately restarted.
  if (USE_MOCK_API) return null;

  const now = new Date().toISOString();
  const body: Record<string, unknown> = {};
  if (patch.toursSeen?.length)
    body.tours_seen = Object.fromEntries(patch.toursSeen.map((id) => [id, now]));
  if (patch.seedsShown?.length)
    body.seeds_shown = Object.fromEntries(patch.seedsShown.map((id) => [id, now]));
  if (patch.toursDisabled !== undefined) body.tours_disabled = patch.toursDisabled;
  if (patch.reset) body.reset = true;

  const response = await apiClient.patch<TourStateDto>('/users/me/tour-state', body);
  return fromDto(response.data);
}
