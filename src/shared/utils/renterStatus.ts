import { getLeaseEndDate, type Renter } from '@/shared/types';

/**
 * Where a renter sits in the lease lifecycle.
 *
 * Deliberately separate from the *display* status used by the renters list
 * (`active | expiring | overdue`), which answers "does this renter need attention right
 * now" and is derived from the overdue/expiring endpoints. This answers the prior
 * question — "is this lease running at all" — and takes precedence when the two are
 * merged: a lease that ended is neither overdue nor expiring, whatever those lists say.
 */
export type RenterLifecycle = 'upcoming' | 'active' | 'ended';

/** Start-of-day, so a lease ending today still counts as active for its whole last day. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The date the tenancy actually stops: an early termination beats the signed end date.
 * Mirrors `_effective_lease_end` in the backend's renter repository, which is what the
 * server's own active-window queries use — so the badge and the alerts agree.
 */
export function getEffectiveLeaseEnd(renter: Renter): Date | null {
  const scheduled = getLeaseEndDate(renter);
  if (!renter.terminated_on) return scheduled;
  const terminated = new Date(renter.terminated_on);
  if (isNaN(terminated.getTime())) return scheduled;
  if (!scheduled) return terminated;
  return terminated < scheduled ? terminated : scheduled;
}

export function isTerminated(renter: Renter): boolean {
  return Boolean(renter.terminated_on);
}

export function getRenterLifecycle(renter: Renter, today: Date = startOfToday()): RenterLifecycle {
  // An explicit termination ends the lease the moment it is recorded, even when the last
  // day is today. The owner has declared the tenancy over, so the app must stop offering
  // to extend it. (The server's active window is deliberately *not* the same: it keeps
  // the renter chaseable through that final day, because this month's rent may still be
  // owed.)
  if (isTerminated(renter)) return 'ended';

  const end = getEffectiveLeaseEnd(renter);
  if (end && end < today) return 'ended';

  if (renter.lease_start) {
    const start = new Date(renter.lease_start);
    if (!isNaN(start.getTime()) && start > today) return 'upcoming';
  }

  // No dates at all reads as active rather than ended — a half-entered renter is
  // something the owner is still working on, not an archived one.
  return 'active';
}
