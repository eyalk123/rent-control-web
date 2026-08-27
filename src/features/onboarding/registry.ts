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
      // Opening cold on a spotlight over a nav item points at something before saying
      // what is happening. This is the arrival. Being unanchored *and* first is what
      // gets it the larger title-card treatment — see TourOverlay.
      { id: 'welcome', anchor: null, placement: 'center' },
      { id: 'home', anchor: ANCHORS.navHome, placement: 'end' },
      { id: 'portfolio', anchor: ANCHORS.navProperties, placement: 'end', seed: { id: 'scan-lease', opens: 'lease-scan' } },
      { id: 'renters', anchor: ANCHORS.navRenters, placement: 'end' },
      { id: 'money', anchor: ANCHORS.navTransactions, placement: 'end' },
      // Reports before Suppliers because that is the order the sidebar draws them: Reports
      // closes the main group, Suppliers sits below the "Manage" divider (navConfig.ts).
      // The other way round the spotlight jumps down past Reports and then back up to it.
      //
      // Optional, both: they live only in the two sidebar variants. The bottom bar shows
      // four tabs and puts the rest behind a "More" sheet whose items carry no anchor, so
      // below `lg` neither resolves to a visible element — and a required step that never
      // mounts suppresses the entire tour. They drop instead.
      { id: 'reports', anchor: ANCHORS.navReports, placement: 'end', optional: true },
      { id: 'suppliers', anchor: ANCHORS.navSuppliers, placement: 'end', optional: true },
      // No seed here any more: the home tour points a spotlight at the reminder-settings
      // control itself, so a sentence naming it would say the same thing twice.
      { id: 'bell', anchor: ANCHORS.homeNotificationsBell, placement: 'bottom' },
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
      // A beat before the first spotlight. Without it the sweep goes from a control in the
      // top bar straight to a figure halfway down the page, with nothing saying you have
      // arrived somewhere. Centred and unanchored, so the full scrim makes it read as being
      // about the page rather than any one part of it.
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'summary', anchor: ANCHORS.homeSummaryCards, placement: 'bottom' },
      { id: 'quickActions', anchor: ANCHORS.homeQuickActions, placement: 'bottom' },
      { id: 'attention', anchor: ANCHORS.homeNeedsAttention, placement: 'bottom', seed: { id: 'alert-actions', opens: null } },
      // Beside the Needs Attention label, where mobile has always had it. It used to
      // point inside the alerts panel and open it — the control existed nowhere else —
      // which worked but made the tour reach into the app to reveal its own target.
      { id: 'notifications', anchor: ANCHORS.homeManageNotifications, placement: 'bottom' },
      { id: 'occupancy', anchor: ANCHORS.homeOccupancy, placement: 'bottom' },
      { id: 'recent', anchor: ANCHORS.homeRecent, placement: 'top' },
    ],
  },

  /* ----------------------------------------------------------------- page tours */

  /**
   * The two display steps are a demonstration, not a description: the page renders cards
   * while `cards` is showing and the table while `table` is, so the mode is something the
   * user watches happen. PropertiesListPage derives that from the active step — it never
   * writes the stored preference, which is the user's.
   *
   * `table` is `optional` because it points at the view toggle, which lives inside a
   * `hidden lg:flex` wrapper. Below that width the page forces cards whatever the toggle
   * says, so the step would be describing something that cannot appear — and dropping
   * itself along with the toggle is exactly the right behaviour.
   */
  'properties-list': {
    id: 'properties-list',
    route: '/properties',
    gate: 'hasProperties',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'headline', anchor: ANCHORS.propertiesHeaderMeta, placement: 'bottom' },
      // Shared with the renters tour, which is the same kind of screen: whichever tab
      // is opened first says these, and the other stays quiet. See `sharedWith`.
      { id: 'add', anchor: ANCHORS.propertiesAddButton, placement: 'bottom', sharedWith: ['renters-list'] },
      { id: 'select', anchor: ANCHORS.propertiesSelect, placement: 'bottom', seed: { id: 'bulk-select', opens: null }, sharedWith: ['renters-list'] },
      // The copy is about search, filters and sort being remembered — a claim about this
      // bar, not about the list below it.
      { id: 'persistence', anchor: ANCHORS.propertiesSearch, placement: 'bottom', sharedWith: ['renters-list'] },
      // Not shared: a property card and a renter card show different things.
      { id: 'cards', anchor: ANCHORS.propertiesList, placement: 'bottom' },
      { id: 'table', anchor: ANCHORS.propertiesViewToggle, placement: 'bottom', optional: true, sharedWith: ['renters-list'] },
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

  /** Same shape as the properties tour, including the live display-mode demo. */
  'renters-list': {
    id: 'renters-list',
    route: '/renters',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'headline', anchor: ANCHORS.rentersHeaderMeta, placement: 'bottom' },
      // Shared with the properties tour — see the note there.
      { id: 'add', anchor: ANCHORS.rentersAddButton, placement: 'bottom', sharedWith: ['properties-list'] },
      { id: 'ended', anchor: ANCHORS.rentersEndedFilter, placement: 'bottom', seed: { id: 'ended-tenants', opens: null } },
      { id: 'select', anchor: ANCHORS.rentersSelect, placement: 'bottom', sharedWith: ['properties-list'] },
      { id: 'search', anchor: ANCHORS.rentersSearch, placement: 'bottom', sharedWith: ['properties-list'] },
      { id: 'cards', anchor: ANCHORS.rentersList, placement: 'bottom' },
      { id: 'table', anchor: ANCHORS.rentersViewToggle, placement: 'bottom', optional: true, sharedWith: ['properties-list'] },
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
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'hero', anchor: ANCHORS.transactionsHero, placement: 'bottom' },
      { id: 'filter', anchor: ANCHORS.transactionsFilter, placement: 'bottom' },
      // Reading order down the screen from here: the month heading, then the rows under
      // it, then the button that adds one. `forMonth` used to sit on the add button, the
      // same element as `recording` below it, so two steps about unrelated things
      // spotlighted one control twice — and the fact it describes, that rent files under
      // the month it is *for*, is visible in the heading and nowhere near that button.
      { id: 'forMonth', anchor: ANCHORS.transactionsMonthHeader, placement: 'bottom', optional: true },
      { id: 'twoKinds', anchor: ANCHORS.transactionsList, placement: 'bottom', seed: { id: 'no-auto-rent', opens: null } },
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
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'categories', anchor: ANCHORS.suppliersCategories, placement: 'bottom' },
      { id: 'what', anchor: ANCHORS.suppliersList, placement: 'bottom' },
    ],
  },

  notifications: {
    id: 'notifications',
    route: '/settings/notifications',
    gate: 'always',
    kind: 'elaboration',
    // No `arrivesFrom`: nothing seeds this any more — the home tour points straight at
    // the control that leads here, so nobody arrives off a sentence read earlier.
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
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'two', anchor: ANCHORS.reportsCards, placement: 'bottom' },
      { id: 'export', anchor: ANCHORS.reportsExport, placement: 'top' },
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
  const byId = TOURS as Record<string, TourDefinition | undefined>;
  for (const tour of tours) {
    for (const step of tour.steps) {
      if (step.seed?.opens && !defined.has(step.seed.opens)) {
        errors.push(
          `${tour.id}.${step.id}: seed opens '${step.seed.opens}', which this platform has no tour for`,
        );
      }
      // A shared step has to be declared from both ends. Named one way only, one tab
      // suppresses the step while the other still shows it — which looks like working
      // software from either side on its own, and is why this is checked rather than
      // trusted.
      for (const other of step.sharedWith ?? []) {
        const partner = byId[other];
        if (!partner) {
          errors.push(
            `${tour.id}.${step.id}: shared with '${other}', which this platform has no tour for`,
          );
          continue;
        }
        if (!partner.steps.some((s) => s.sharedWith?.includes(tour.id))) {
          errors.push(
            `${tour.id}.${step.id}: shared with '${other}', but nothing there shares back`,
          );
        }
      }
    }
  }
  return errors;
}
