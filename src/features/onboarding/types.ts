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
  'property-detail',
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
  /**
   * A step dropped once this gate passes — the mirror of `gate` on a whole tour.
   *
   * `optional` asks "is the element there?"; this asks "is this step still worth saying?".
   * The closing "start with one property" card is the case it exists for: it has to be the
   * last thing an empty account sees, and it is noise to an account with a portfolio
   * already. Without it the step would either be misplaced for everyone or missing for the
   * one person it is written for.
   *
   * Resolved exactly like `optional` — excluded from the anchor wait, dropped at open time —
   * so the step counter stays truthful. It still counts against the budget.
   */
  skipWhen?: GateId;
  /**
   * A step whose element does not exist until the step is reached — because reaching it is
   * what creates the element. Excluded from the anchor wait like `optional`, but **never
   * dropped**: the screen that owns the surface reveals the element when the step arrives
   * and puts things back afterwards (see `useTourStep`).
   *
   * The two-page forms are what this is for. Page two's fields are unmounted while page one
   * shows, so a tour that covers the whole form has to reach steps whose elements do not
   * exist when it opens. Neither other flag fits: waiting would suppress the entire tour,
   * and `optional` would drop exactly the steps that were asked for. The form derives its
   * shown page from the running step and flips back on its own when the tour ends.
   *
   * It was written earlier for the web home tour's reminder-settings step, when that control
   * existed only at the foot of the alerts panel and the tour opened the panel to reach it.
   * That case went away when the control moved onto Home itself — the better answer — and
   * the flag was kept on the bet that the situation would recur. It did.
   */
  revealsAnchor?: boolean;
  /**
   * Other tours that carry this same step. If any of them has been seen, this has already
   * been said, and the step is dropped here.
   *
   * Properties and Renters are the same kind of screen, so their tours were explaining the
   * Add menu, multi-select, search persistence and the table view once per tab, in wording
   * that differed only in the noun. Whichever tab the user opens first is the one that
   * says it; the other stays quiet.
   *
   * It needs no new persistence, which is the whole reason it is shaped this way: "has the
   * other tour run" is a question `tours_seen` already answers. The cost is that skipping
   * a tour also suppresses its shared steps elsewhere — skipping is declining the content,
   * not deferring it, which is how the rest of the model already behaves.
   *
   * Both sides must name each other. A one-sided declaration makes one tab suppress while
   * the other repeats, which nothing would catch by reading — `validateRegistry` checks it.
   */
  sharedWith?: TourId[];
}

export interface TourDefinition {
  id: TourId;
  /** Route this tour belongs to. Informational — the trigger is the anchor mounting. */
  route: string;
  gate: GateId;
  /**
   * orientation — the first-login sweep. Two tours, not one: the chrome (`first-run`,
   *               gate `always`) and then the home screen itself (`home`, gated on there
   *               being something on it). They run back to back on a populated account and
   *               read as a single sequence, which is why they share one ceiling.
   * page        — fires on first meaningful entry to a screen, a form included: a form the
   *               user opens and works through is a screen in every sense this ceiling
   *               cares about, and the forms were being squeezed into `elaboration` for no
   *               better reason than that they had once been given two steps.
   * elaboration — fires when the user acts on a seed or picks a mode. What is left here
   *               answers one question — CPI, custom schedules, a rule editor — and stays
   *               short by nature rather than by restraint.
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
  // Ten is the web chrome plus the two cards that frame it: a welcome, six sidebar
  // destinations, the two top-bar controls, and the closing call to action. It was five
  // when the orientation tour was assumed to be one tour of its own — but the home sweep
  // opens the instant it closes, so five capped a definition rather than an experience.
  orientation: { steps: 10, seeds: 3 },
  // Eight because a page tour is now expected to *cover* its screen — an opening card that
  // says what the screen is for, then every block on it — rather than pick the two or three
  // things most worth saying. Three was the right number for the second kind and is far too
  // few for the first. Still a ceiling and still asserted: it catches a tour that has run
  // away, at a number that matches what a full walk of a screen actually costs.
  page: { steps: 8, seeds: 3 },
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
