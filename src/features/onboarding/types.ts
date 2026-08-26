/**
 * Onboarding — shared schema.
 *
 * This file is intentionally identical in the mobile and web repos. It defines the
 * *shape* of tour content only; nothing here renders, reads state, or touches i18n.
 * The per-platform content lives in `registry.ts`, the anchor inventory in `anchors.ts`.
 *
 * The model is two-layer disclosure:
 *   - a SEED names a feature the user cannot see from where they are standing, in one
 *     sentence, so they know it is worth opening;
 *   - the TOUR at the destination elaborates on how it actually works.
 * Showing a seed never marks its destination tour as seen — the two are tracked apart.
 */

/** Every tour in the product. Not all exist on both platforms (see registry). */
export const TOUR_IDS = [
  'first-run',
  'home',
  'properties-list',
  'property-form',
  'renters-list',
  'lease-form',
  'cpi-mode',
  'custom-mode',
  'transactions-list',
  'revenue-form',
  'expense-form',
  'renter-detail',
  'extend-lease',
  'suppliers',
  'notifications',
  'notification-rules',
  'whatsapp-templates',
  'reports',
  'lease-scan',
  'chat',
] as const;
export type TourId = (typeof TOUR_IDS)[number];

/** Every seed. Tracked separately from tours in `tour_state.seeds_shown`. */
export const SEED_IDS = [
  'alert-actions',
  'scan-lease',
  'suppliers',
  'reports',
  'notifications',
  'property-owner',
  'ended-tenants',
  'bulk-select',
  'cpi',
  'custom-schedule',
  'no-auto-rent',
  'bulk-rent',
  'expense-split',
  'extend-lease',
  'end-lease',
  'notification-rules',
  'whatsapp-templates',
] as const;
export type SeedId = (typeof SEED_IDS)[number];

/**
 * Named condition the client resolves before a tour may run. A tour whose gate is
 * false is not consumed — it defers to the next visit. This is what replaces a
 * session cap: an irrelevant tour never fires, so a curious user is never throttled.
 */
export type GateId =
  | 'always'
  | 'hasProperties'
  | 'hasRenters'
  | 'hasTransactions'
  | 'listHasThreeItems'
  | 'cpiSelected'
  | 'customSelected';

/** Logical placement. `start`/`end` are direction-relative and flip under RTL. */
export type Placement = 'top' | 'bottom' | 'start' | 'end' | 'center';

export interface TourSeed {
  id: SeedId;
  /** Tour this seed advertises, if any. Null = the sentence is the whole point. */
  opens: TourId | null;
}

export interface TourStep {
  id: string;
  /** Anchor key from `anchors.ts`. Null renders a centered card with no highlight. */
  anchor: string | null;
  placement?: Placement;
  /** At most one seed per step; at most two per tour (see `assertBudget`). */
  seed?: TourSeed;
  /**
   * A step whose element may legitimately not be there.
   *
   * A tour normally waits for *every* anchored step before it opens, so one absent element
   * silently suppresses the whole tour. That is right for a step the tour is about, and
   * wrong for one pointing at a feature the account may not have — the assistant launcher
   * only renders once its status request says it is enabled, and without this flag a slow
   * or disabled assistant would stop first-run itself from ever running.
   *
   * An optional step is excluded from the anchor wait, and dropped from the tour if its
   * element is not present at the moment the tour opens. It still counts against the
   * budget: it is a step someone might see.
   */
  optional?: boolean;
}

export interface TourDefinition {
  id: TourId;
  /** Route this tour belongs to. Informational — the trigger is the anchor mounting. */
  route: string;
  gate: GateId;
  /**
   * orientation — the one first-run tour.
   * page        — fires on first meaningful entry to a screen.
   * elaboration — fires when the user acts on a seed or picks a mode.
   */
  kind: 'orientation' | 'page' | 'elaboration';
  /** If set, opening this tour after that seed shows a callback line first. */
  arrivesFrom?: SeedId;
  steps: TourStep[];
}

/** i18n key conventions. Copy never lives in the registry. */
export const tourStepKey = (tour: TourId, step: string, part: 'title' | 'body') =>
  `onboarding.tours.${tour}.${step}.${part}` as const;
export const seedKey = (seed: SeedId) => `onboarding.seeds.${seed}` as const;
export const callbackKey = (seed: SeedId) => `onboarding.callbacks.${seed}` as const;

/** Step/seed ceilings. This is the rule that keeps the tour from re-becoming a firehose. */
export const BUDGET = {
  orientation: { steps: 5, seeds: 3 },
  page: { steps: 3, seeds: 2 },
  // A destination can seed nested children of its own: notification settings
  // seeds the rule editor and the WhatsApp templates that sit inside it.
  elaboration: { steps: 3, seeds: 2 },
} as const;

export function assertBudget(tour: TourDefinition): string[] {
  const limit = BUDGET[tour.kind];
  const seeds = tour.steps.filter((s) => s.seed).length;
  const errors: string[] = [];
  if (tour.steps.length > limit.steps)
    errors.push(`${tour.id}: ${tour.steps.length} steps exceeds ${limit.steps}`);
  if (seeds > limit.seeds) errors.push(`${tour.id}: ${seeds} seeds exceeds ${limit.seeds}`);
  return errors;
}
