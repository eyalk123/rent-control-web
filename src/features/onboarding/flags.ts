/**
 * Onboarding — the master switch.
 *
 * The tours are finished and on by default in every build, for every account. A user who
 * does not want them turns them off in Settings (the account-level `toursDisabled` flag).
 *
 * Resolved once, at module load, rather than per call — `enabled` flipping mid-session
 * would leave a tour half open with no state to close it. Playwright sets its override in
 * `addInitScript`, which runs before any of this, so reading it here is early enough.
 *
 * Precedence, highest first:
 *
 *   1. `localStorage['onboarding.tours']` — a per-browser override, and the only one that
 *      works against an already-deployed build. `rentvanceTours(true)` in the console
 *      sets it, `rentvanceTours(false)` clears it to off for this browser, and
 *      `e2e/onboarding.spec.ts` arms itself this way.
 *   2. `VITE_ONBOARDING_TOURS` (`on` / `off`) — build-time. Setting it to `off` as a
 *      Railway service variable switches the tours off in production; that is a deploy,
 *      not a code change. The Dockerfile forwards it.
 *   3. Playwright (`VITE_E2E_AUTH_BYPASS`) — off. The first-run tour is a click-blocking
 *      scrim on `/home`, so leaving it armed would put an overlay in front of every
 *      unrelated spec in the suite.
 *   4. Otherwise: on.
 *
 * Note (1) beats (2) on purpose, so a personal override survives a deploy. If the tours
 * ever need a genuine remote kill switch, that is the account-level `toursDisabled` flag
 * the server already stores, not this.
 */

/** The per-browser override. */
export const TOURS_OVERRIDE_KEY = 'onboarding.tours';

function readFlag(raw: string | null | undefined): boolean | null {
  if (raw === 'on' || raw === 'true' || raw === '1') return true;
  if (raw === 'off' || raw === 'false' || raw === '0') return false;
  return null;
}

function resolve(): boolean {
  let stored: boolean | null = null;
  try {
    stored = readFlag(localStorage.getItem(TOURS_OVERRIDE_KEY));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Not a reason to fail.
  }
  if (stored !== null) return stored;

  if (import.meta.env.VITE_E2E_AUTH_BYPASS === 'true') return false;

  const fromEnv = readFlag(import.meta.env.VITE_ONBOARDING_TOURS as string | undefined);
  if (fromEnv !== null) return fromEnv;

  return true;
}

/**
 * Whether the guided tours may run at all. When false nothing about onboarding happens:
 * no tour state is fetched, no tour opens, no overlay mounts. Anchors stay registered —
 * they cost a ref callback each and keep the call sites honest while the content is
 * being written.
 */
export const TOURS_ENABLED = resolve();

declare global {
  interface Window {
    /** Flip the per-browser override and reload. Available in every build, deliberately. */
    rentvanceTours?: (on: boolean) => void;
  }
}

if (typeof window !== 'undefined') {
  window.rentvanceTours = (on: boolean) => {
    try {
      localStorage.setItem(TOURS_OVERRIDE_KEY, on ? 'on' : 'off');
    } catch {
      return;
    }
    window.location.reload();
  };
}
