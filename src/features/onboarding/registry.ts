/**
 * Onboarding — content registry (web).
 *
 * Same schema and the same tour/seed IDs as mobile, so copy is shared and a user who
 * saw a tour on the phone does not see it again here. It diverges only where the
 * navigation genuinely differs:
 *   - the assistant is a launcher in the top bar and a side panel, not a tab, so the
 *     `chat` tour fires when the panel opens rather than on a route;
 *   - Suppliers and Reports are top-level sidebar entries, not nested, so each gets its
 *     own step in the sweep instead of the seed it carries on mobile — and Reports is not
 *     a card on Home here, which is why mobile's `home.reports` copy has no place on web;
 *   - alerts also live in a bell panel, which gets a step of its own next to the assistant;
 *   - no `whatsapp-templates` tour, because web has no template editor.
 */
import { ANCHORS } from './anchors';
import { assertBudget, type TourDefinition, type TourId } from './types';

export const TOURS = {
  /* ---------------------------------------------------------------- orientation */

  'first-run': {
    id: 'first-run',
    route: '/home',
    gate: 'always',
    kind: 'orientation',
    steps: [
      { id: 'home', anchor: ANCHORS.navHome, placement: 'end' },
      { id: 'portfolio', anchor: ANCHORS.navProperties, placement: 'end', seed: { id: 'scan-lease', opens: 'lease-scan' } },
      { id: 'renters', anchor: ANCHORS.navRenters, placement: 'end' },
      { id: 'money', anchor: ANCHORS.navTransactions, placement: 'end' },
      // Optional, both: Suppliers and Reports live only in the two sidebar variants. The
      // bottom bar shows four tabs and puts the rest behind a "More" sheet whose items
      // carry no anchor, so below `lg` neither resolves to a visible element — and a
      // required step that never mounts suppresses the entire tour. They drop instead.
      { id: 'suppliers', anchor: ANCHORS.navSuppliers, placement: 'end', optional: true },
      { id: 'reports', anchor: ANCHORS.navReports, placement: 'end', optional: true },
      { id: 'bell', anchor: ANCHORS.homeNotificationsBell, placement: 'bottom', seed: { id: 'notifications', opens: 'notifications' } },
      // Optional for the same reason: the launcher only renders once the assistant's
      // status request comes back enabled.
      { id: 'chat', anchor: ANCHORS.chatLauncher, placement: 'bottom', optional: true },
      // The closing call to action, and only for someone who still needs it. An account
      // with a portfolio drops it, which is also what puts the home sweep immediately
      // after the assistant instead of after a card telling them to do what they did
      // months ago.
      { id: 'start', anchor: null, placement: 'center', skipWhen: 'hasProperties' },
    ],
  },

  /**
   * The second half of the first-login sweep: first-run explains the chrome, this explains
   * the screen you are standing on. It opens the moment first-run closes, so the two read
   * as one sequence and are budgeted as one (see BUDGET.orientation in types.ts).
   *
   * The steps walk Home top to bottom, in the order HomePage renders them, because a tour
   * that jumps around a screen is harder to follow than the screen itself. Everything here
   * is mounted from the first render, so there is nothing to wait for beyond the gate —
   * which is `hasRenters`, since every one of these cards is a shrug when empty.
   */
  home: {
    id: 'home',
    route: '/home',
    gate: 'hasRenters',
    kind: 'orientation',
    steps: [
      { id: 'summary', anchor: ANCHORS.homeSummaryCards, placement: 'bottom' },
      { id: 'quickActions', anchor: ANCHORS.homeQuickActions, placement: 'bottom' },
      { id: 'attention', anchor: ANCHORS.homeNeedsAttention, placement: 'bottom', seed: { id: 'alert-actions', opens: null } },
      { id: 'occupancy', anchor: ANCHORS.homeOccupancy, placement: 'bottom' },
      { id: 'recent', anchor: ANCHORS.homeRecent, placement: 'top' },
    ],
  },

  /* ----------------------------------------------------------------- page tours */

  'properties-list': {
    id: 'properties-list',
    route: '/properties',
    gate: 'hasProperties',
    kind: 'page',
    steps: [
      { id: 'cards', anchor: ANCHORS.propertiesList, placement: 'bottom' },
      // Points at the search/filter bar, not the list: the copy is about search, filters
      // and sort being remembered, which is a claim about that bar. Both steps used to
      // highlight the same list wrapper, which said nothing and covered the screen.
      { id: 'persistence', anchor: ANCHORS.propertiesSearch, placement: 'bottom', seed: { id: 'bulk-select', opens: null } },
    ],
  },

  'property-form': {
    id: 'property-form',
    route: '/properties',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'twoSteps', anchor: ANCHORS.propertyFormStepper, placement: 'bottom' },
      { id: 'owner', anchor: ANCHORS.propertyFormOwnerField, placement: 'bottom', seed: { id: 'property-owner', opens: null } },
    ],
  },

  'renters-list': {
    id: 'renters-list',
    route: '/renters',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'current', anchor: ANCHORS.rentersList, placement: 'bottom' },
      { id: 'ended', anchor: ANCHORS.rentersEndedFilter, placement: 'bottom', seed: { id: 'ended-tenants', opens: null } },
    ],
  },

  /** The densest screen in the product — the only page tour that uses its full budget. */
  'lease-form': {
    id: 'lease-form',
    route: '/renters',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'term', anchor: ANCHORS.leaseTermBuilder, placement: 'bottom' },
      { id: 'mode', anchor: ANCHORS.leaseRentChangeField, placement: 'bottom', seed: { id: 'cpi', opens: 'cpi-mode' } },
      { id: 'baseYear', anchor: ANCHORS.leaseBaseRent, placement: 'bottom', seed: { id: 'custom-schedule', opens: 'custom-mode' } },
    ],
  },

  'transactions-list': {
    id: 'transactions-list',
    route: '/transactions',
    gate: 'hasProperties',
    kind: 'page',
    steps: [
      { id: 'twoKinds', anchor: ANCHORS.transactionsList, placement: 'bottom' },
      { id: 'forMonth', anchor: ANCHORS.transactionsAddButton, placement: 'bottom', seed: { id: 'no-auto-rent', opens: null } },
      { id: 'recording', anchor: ANCHORS.transactionsAddButton, placement: 'bottom', seed: { id: 'bulk-rent', opens: 'revenue-form' } },
    ],
  },

  'renter-detail': {
    id: 'renter-detail',
    route: '/renters/:id',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'timeline', anchor: ANCHORS.renterDetailTimeline, placement: 'bottom' },
      { id: 'extend', anchor: ANCHORS.renterDetailExtend, placement: 'bottom', seed: { id: 'extend-lease', opens: 'extend-lease' } },
      { id: 'end', anchor: ANCHORS.renterDetailEndLease, placement: 'bottom', seed: { id: 'end-lease', opens: null } },
    ],
  },

  /**
   * The assistant is a side panel here rather than a tab, so `route` is nominal — the
   * trigger is the composer mounting, which happens when the panel opens. First-run points
   * at the launcher; this explains the thing once someone is actually inside it.
   */
  chat: {
    id: 'chat',
    route: '/home',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'ask', anchor: ANCHORS.chatInput, placement: 'top' },
      { id: 'scope', anchor: null, placement: 'center' },
    ],
  },

  /* ------------------------------------------------- destinations / elaborations */

  'cpi-mode': {
    id: 'cpi-mode',
    route: '/renters',
    gate: 'cpiSelected',
    kind: 'elaboration',
    arrivesFrom: 'cpi',
    steps: [
      { id: 'base', anchor: ANCHORS.leaseCpiBase, placement: 'bottom' },
      { id: 'lag', anchor: null, placement: 'center' },
      { id: 'reanchor', anchor: null, placement: 'center' },
    ],
  },

  'custom-mode': {
    id: 'custom-mode',
    route: '/renters',
    gate: 'customSelected',
    kind: 'elaboration',
    arrivesFrom: 'custom-schedule',
    steps: [
      { id: 'perYear', anchor: ANCHORS.leaseYearRows, placement: 'bottom' },
      { id: 'forward', anchor: null, placement: 'center' },
    ],
  },

  'revenue-form': {
    id: 'revenue-form',
    route: '/transactions',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'bulk-rent',
    steps: [
      { id: 'scope', anchor: ANCHORS.revenuePropertyPicker, placement: 'bottom' },
      { id: 'perContract', anchor: ANCHORS.revenueAmountCell, placement: 'bottom' },
      { id: 'saving', anchor: null, placement: 'center' },
    ],
  },

  'expense-form': {
    id: 'expense-form',
    route: '/transactions',
    gate: 'always',
    kind: 'elaboration',
    steps: [
      { id: 'required', anchor: ANCHORS.expenseCategoryField, placement: 'bottom' },
      { id: 'split', anchor: ANCHORS.expensePropertyPicker, placement: 'bottom', seed: { id: 'expense-split', opens: null } },
    ],
  },

  'extend-lease': {
    id: 'extend-lease',
    route: '/renters/:id',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'extend-lease',
    steps: [
      { id: 'months', anchor: ANCHORS.extendYearsStepper, placement: 'bottom' },
      { id: 'optionLast', anchor: ANCHORS.extendPreview, placement: 'top' },
    ],
  },

  /**
   * No `arrivesFrom` on web: Suppliers has its own step in the sweep, so nobody arrives
   * here off the `suppliers` seed and a callback line would answer a question that was
   * never asked. Mobile keeps the seed — Suppliers is a button inside Transactions there.
   */
  suppliers: {
    id: 'suppliers',
    route: '/suppliers',
    gate: 'always',
    kind: 'elaboration',
    steps: [
      { id: 'what', anchor: ANCHORS.suppliersList, placement: 'bottom' },
      { id: 'categories', anchor: ANCHORS.suppliersCategories, placement: 'bottom' },
    ],
  },

  notifications: {
    id: 'notifications',
    route: '/settings/notifications',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'notifications',
    steps: [
      { id: 'events', anchor: ANCHORS.notificationsEventList, placement: 'bottom' },
      { id: 'rules', anchor: ANCHORS.notificationsRulesEntry, placement: 'bottom', seed: { id: 'notification-rules', opens: 'notification-rules' } },
      // No `templates` step on web: the WhatsApp template editor is a mobile-only screen,
      // so there is nothing here to point at and nothing for the seed to open. Restore the
      // step (and the `whatsapp-templates` tour below) when the web app grows one.
    ],
  },

  'notification-rules': {
    id: 'notification-rules',
    route: '/settings/notifications',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'notification-rules',
    steps: [
      { id: 'offsets', anchor: ANCHORS.ruleOffsets, placement: 'bottom' },
      { id: 'scope', anchor: ANCHORS.ruleScope, placement: 'bottom' },
      { id: 'cpiException', anchor: null, placement: 'center' },
    ],
  },

  // 'whatsapp-templates' is deliberately absent — see the notifications tour above. The
  // copy for it exists in i18n for the day the web app gains a template editor.


  /** No `arrivesFrom`, for the same reason as `suppliers` above: Reports is a sidebar
   *  destination with its own step here, not something a seed has to point at. */
  reports: {
    id: 'reports',
    route: '/reports',
    gate: 'always',
    kind: 'elaboration',
    steps: [
      { id: 'two', anchor: ANCHORS.reportsCards, placement: 'bottom' },
      { id: 'export', anchor: ANCHORS.reportsExport, placement: 'bottom' },
    ],
  },

  /**
   * The review step is centred, not anchored. `scanSummary` lives in the summary drawer,
   * which only opens *after* an extraction has run — and a tour opens only when every
   * anchored step's element is mounted at once, so pointing at it here would mean this
   * tour could never open. Both remaining steps are promises about what happens next,
   * which is what an elaboration arriving from the `scan-lease` seed is.
   */
  'lease-scan': {
    id: 'lease-scan',
    route: '/properties',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'scan-lease',
    steps: [
      { id: 'pick', anchor: ANCHORS.scanPicker, placement: 'bottom' },
      { id: 'review', anchor: null, placement: 'center' },
      { id: 'both', anchor: null, placement: 'center' },
    ],
  },
} satisfies Partial<Record<TourId, TourDefinition>>;

export type WebTourId = keyof typeof TOURS;

/**
 * The registry's structural invariants — everything checkable without i18n loaded.
 *
 * Asserted from `e2e/onboarding-registry.spec.ts`, which additionally checks that every
 * step, seed and callback has copy in both languages. The mobile repo runs this same
 * function at import time under `__DEV__`, since it has no test layer.
 */
export function validateRegistry(): string[] {
  const tours = Object.values(TOURS as Record<string, TourDefinition>);
  const errors = tours.flatMap(assertBudget);
  // A seed that opens a tour this platform does not define advertises a destination that
  // can never open, and fails silently: nothing throws when the user finally gets there.
  const defined = new Set(Object.keys(TOURS));
  for (const tour of tours) {
    for (const step of tour.steps) {
      if (step.seed?.opens && !defined.has(step.seed.opens)) {
        errors.push(
          `${tour.id}.${step.id}: seed opens '${step.seed.opens}', which this platform has no tour for`,
        );
      }
    }
  }
  return errors;
}
