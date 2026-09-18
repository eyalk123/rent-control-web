import { getCurrentMonthlyRent, getLeaseEndDate, getScheduleEndDate, type Renter } from '@/shared/types';

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

/** The earlier of an early termination and `scheduled`. Shared by the two end dates below. */
function withTermination(renter: Renter, scheduled: Date | null): Date | null {
  if (!renter.terminated_on) return scheduled;
  const terminated = new Date(renter.terminated_on);
  if (isNaN(terminated.getTime())) return scheduled;
  if (!scheduled) return terminated;
  return terminated < scheduled ? terminated : scheduled;
}

/**
 * The end date to *show*: the binding term (`getLeaseEndDate`), pulled in by an early
 * termination. That is the date the landlord actually has to decide something, which is
 * what the apps display and what the lease-expiring alerts count down to.
 *
 * Not the date that decides whether the lease is still running — see
 * {@link getEffectiveScheduleEnd}.
 */
export function getEffectiveLeaseEnd(renter: Renter): Date | null {
  return withTermination(renter, getLeaseEndDate(renter));
}

/**
 * A tenancy with no agreed end.
 *
 * Every screen that shows a lease end has to consult this, because an open-ended lease
 * *does* carry an end date — the server keeps a rolling five-year window so the queries that
 * decide whether a renter is active keep working — and that date moves every year. Printing
 * it would assert an end the app invented and then quietly changed.
 */
export function isOpenEnded(renter: Renter): boolean {
  return renter.open_ended === true && !renter.terminated_on;
}

/**
 * The date the tenancy actually stops: the whole signed schedule, options included,
 * pulled in by an early termination.
 *
 * Options count because an option year is still a year the tenant may be living there and
 * owing rent. Mirrors `effective_lease_end()` in the backend's renter repository —
 * `coalesce(terminated_on, lease_end)`, where the stored `lease_end` is `schedule_end`,
 * not `contract_end` — so the badge and the alerts agree. It read the contract end before, which
 * filed a tenant in an exercised option year as a past tenant of a vacant flat.
 */
function getEffectiveScheduleEnd(renter: Renter): Date | null {
  return withTermination(renter, getScheduleEndDate(renter));
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

  const end = getEffectiveScheduleEnd(renter);
  if (end && end < today) return 'ended';

  if (renter.lease_start) {
    const start = new Date(renter.lease_start);
    if (!isNaN(start.getTime()) && start > today) return 'upcoming';
  }

  // No dates at all reads as active rather than ended — a half-entered renter is
  // something the owner is still working on, not an archived one.
  return 'active';
}

/**
 * The renters a property's "current" figures are about — everyone whose lease has not
 * ended. Same split the property renters tab shows as current vs. previous tenants.
 *
 * Upcoming leases stay in: one signed to start next month is the property's rent going
 * forward, and dropping it would read as a bug. An ended one is gone, and nothing else
 * removes it — `getCurrentMonthlyRent` keeps quoting a finished lease's last period
 * forever, since the schedule has no amount after its final year.
 */
export function getCurrentRenters(renters: Renter[] | null | undefined): Renter[] {
  if (!renters?.length) return [];
  return renters.filter((r) => getRenterLifecycle(r) !== 'ended');
}

/**
 * Total monthly rent a property brings in now: each *current* renter at its current
 * lease-year amount. Ended tenancies are excluded — they are still on
 * `property.renters` (they are the record of who was here and what they paid), so
 * summing that list raw double-counts a unit that has since been re-let, and keeps
 * billing a vacant one.
 */
export function getTotalCurrentMonthlyRent(renters: Renter[] | null | undefined): number {
  return getCurrentRenters(renters).reduce((sum, r) => sum + getCurrentMonthlyRent(r), 0);
}
