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
    // `hasProperties`, not `hasRenters`: a landlord who has entered two properties and no
    // tenants yet was being shown nothing here, and every card on this screen is about the
    // portfolio before it is about the people in it. Not `always`, unlike the list tours —
    // this one opens the instant `first-run` closes, and `first-run` ends on the single
    // instruction written for an empty account ("start with one property"). Seven more
    // cards on top of that call to action buries the one thing we want acted on.
    gate: 'hasProperties',
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
    // `always`. This screen is where a new account lands first and it is the one that has
    // to explain the two ways a property gets in, so gating the tour on there already
    // being properties withheld it from exactly the person it was written for. Only the
    // step that points at a card needs a portfolio, and it says so itself below.
    gate: 'always',
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
      // The anchor is the first card, so on an empty list there is nothing to point at.
      // `skipWhen` rather than `optional`: optional would drop the step whenever the
      // element merely has not rendered *yet*, and the header and filter bar mount before
      // the list does, so a real portfolio would lose this step on a slow load.
      { id: 'cards', anchor: ANCHORS.propertiesList, placement: 'bottom', skipWhen: 'noProperties' },
      { id: 'table', anchor: ANCHORS.propertiesViewToggle, placement: 'bottom', optional: true, sharedWith: ['renters-list'] },
    ],
  },

  /**
   * The form tours all open with an unanchored card, the way the tab tours do. It used to be
   * that someone opening this drawer was told about the owner field without ever being told
   * what the form was or that it had a second page.
   *
   * The last two steps live on that second page, which is unmounted while the first shows.
   * `revealsAnchor` keeps them out of the anchor wait without dropping them, and the drawer
   * derives the page it displays from the running step (see PropertyFormDrawer).
   */
  'property-form': {
    id: 'property-form',
    route: '/properties',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'twoSteps', anchor: ANCHORS.propertyFormStepper, placement: 'bottom' },
      { id: 'owner', anchor: ANCHORS.propertyFormOwnerField, placement: 'bottom', seed: { id: 'property-owner', opens: null }, revealsAnchor: true },
      { id: 'records', anchor: ANCHORS.propertyFormRecords, placement: 'top', revealsAnchor: true },
    ],
  },

  /** Same shape as the properties tour, including the live display-mode demo. */
  'renters-list': {
    id: 'renters-list',
    route: '/renters',
    // `always`, for the reason the properties tour is — see the note there.
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'headline', anchor: ANCHORS.rentersHeaderMeta, placement: 'bottom' },
      // Shared with the properties tour — see the note there.
      { id: 'add', anchor: ANCHORS.rentersAddButton, placement: 'bottom', sharedWith: ['properties-list'] },
      { id: 'ended', anchor: ANCHORS.rentersEndedFilter, placement: 'bottom', seed: { id: 'ended-tenants', opens: null } },
      { id: 'select', anchor: ANCHORS.rentersSelect, placement: 'bottom', sharedWith: ['properties-list'] },
      { id: 'search', anchor: ANCHORS.rentersSearch, placement: 'bottom', sharedWith: ['properties-list'] },
      // Unlike the properties tour this anchor is the list *wrapper*, so it is present
      // even when empty — and would spotlight an empty state while the copy described a
      // face and a phone number. Dropped when there is nobody to show.
      { id: 'cards', anchor: ANCHORS.rentersList, placement: 'bottom', skipWhen: 'noRenters' },
      { id: 'table', anchor: ANCHORS.rentersViewToggle, placement: 'bottom', optional: true, sharedWith: ['properties-list'] },
    ],
  },

  /**
   * The densest screen in the product, and the tour now covers the renter form as a whole
   * rather than only its lease terms — the opening card is what page one gets, since a card
   * pointing at a name field would be the step-per-field this is meant to avoid.
   *
   * Everything after the opener is on page two and marked `revealsAnchor`; the drawer flips
   * the page it shows for them. The name stays `lease-form`: the lease is what the tour is
   * mostly about, and renaming it would move every copy key for no gain.
   */
  'lease-form': {
    id: 'lease-form',
    route: '/renters',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      // The one page-one field worth a stop of its own: a repeating sub-form where every
      // other field on that page is a plain input, and nothing on it says who a second
      // contact is for or that it is optional.
      { id: 'extraContacts', anchor: ANCHORS.renterFormExtraContacts, placement: 'top', revealsAnchor: true },
      { id: 'term', anchor: ANCHORS.leaseTermBuilder, placement: 'bottom', revealsAnchor: true },
      // `baseYear` before `mode`, which is the order they are in on the screen: LeaseTermBuilder
      // renders the first year's rent directly under the term and the rent-change control
      // below that. Reversed, the tour jumped past the starting rent to explain how it
      // changes, then came back up to say what it starts at. Each keeps the seed it carried —
      // CPI belongs to the mode control, and a custom schedule is a rule per year, which is
      // what the year-one card is already talking about.
      { id: 'baseYear', anchor: ANCHORS.leaseBaseRent, placement: 'bottom', seed: { id: 'custom-schedule', opens: 'custom-mode' }, revealsAnchor: true },
      { id: 'mode', anchor: ANCHORS.leaseRentChangeField, placement: 'bottom', seed: { id: 'cpi', opens: 'cpi-mode', requires: 'cpiLinkage' }, revealsAnchor: true },
      { id: 'payment', anchor: ANCHORS.renterFormPayment, placement: 'top', revealsAnchor: true },
    ],
  },

  'transactions-list': {
    id: 'transactions-list',
    route: '/transactions',
    // `always`. The one step that needs a ledger to exist drops itself; what is left —
    // what the screen is, how to filter it, where rent gets recorded — is the part a new
    // account needs most.
    gate: 'always',
    kind: 'page',
    steps: [
      // Carries `no-auto-rent` because the step that used to — `twoKinds` below — is the
      // one that drops on an empty ledger, and "nothing is charged automatically" is most
      // worth saying to someone who has not recorded anything yet. The opener is the only
      // step here that is present either way.
      { id: 'overview', anchor: null, placement: 'center', seed: { id: 'no-auto-rent', opens: null } },
      // No `skipWhen` here: the summary endpoint pads to six months with zeros, so the
      // chart card renders whether or not anything has been recorded, and a flat line at
      // zero is a fair thing to point at while saying what the card is.
      { id: 'hero', anchor: ANCHORS.transactionsHero, placement: 'bottom' },
      { id: 'filter', anchor: ANCHORS.transactionsFilter, placement: 'bottom' },
      // Reading order down the screen from here: the month heading, then the rows under
      // it, then the button that adds one. `forMonth` used to sit on the add button, the
      // same element as `recording` below it, so two steps about unrelated things
      // spotlighted one control twice — and the fact it describes, that rent files under
      // the month it is *for*, is visible in the heading and nowhere near that button.
      { id: 'forMonth', anchor: ANCHORS.transactionsMonthHeader, placement: 'bottom', optional: true },
      // This one does drop: its anchor is the first month's rows, which do not exist until
      // there is a ledger to group.
      { id: 'twoKinds', anchor: ANCHORS.transactionsList, placement: 'bottom', skipWhen: 'noTransactions' },
      { id: 'recording', anchor: ANCHORS.transactionsAddButton, placement: 'bottom', seed: { id: 'bulk-rent', opens: 'revenue-form' } },
    ],
  },

  /**
   * One tenancy, end to end. It used to be three steps that opened cold on a spotlight over
   * the timeline — the only page tour in the product with no opening card — and said nothing
   * about the two thirds of the screen that are not the lease itself.
   *
   * `payments` and `expenses` point at the tab panel and the page shows the Transactions tab
   * for them: the month grid is the least-discovered thing on this screen, and a step that
   * only *described* it would be describing something the user has never seen. Same
   * demonstration the properties tour gives its two display modes — the page derives the
   * shown tab, and the revenue/expenses segment under it, from the running step and never
   * writes the user's own (see RenterDetailPage).
   *
   * `extend` and `end` are `optional` because the buttons are not on every tenancy: an
   * expired lease has no End, a terminated one has neither. Required, they would hold the
   * whole tour shut on those renters — the anchor wait needs every non-optional step present
   * at once — so a portfolio of past tenants would never see this tour at all. Optional, the
   * tour opens on any renter and the two lifecycle steps drop where their controls are absent.
   */
  'renter-detail': {
    id: 'renter-detail',
    route: '/renters/:id',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'stats', anchor: ANCHORS.renterDetailStats, placement: 'bottom' },
      { id: 'tabs', anchor: ANCHORS.renterDetailTabs, placement: 'bottom' },
      // `revealsAnchor` rather than plain: the timeline lives on the info tab, and it is
      // this step arriving that shows that tab. Without it the tour would be shut for
      // anyone who opened the page on another tab — a deep link from a notification, or a
      // ?tab= the back button restored.
      { id: 'timeline', anchor: ANCHORS.renterDetailTimeline, placement: 'bottom', revealsAnchor: true },
      { id: 'payments', anchor: ANCHORS.renterDetailPanel, placement: 'top' },
      // The same anchor twice while the page flips the segment behind it — the
      // property-detail arrangement, for the same reason. Revenue and expenses are a
      // segmented toggle here rather than two panels side by side, so a tour that stopped
      // at `payments` showed the rent grid, described expenses as sitting "beside" it, and
      // left the user having never seen the half it was describing.
      { id: 'expenses', anchor: ANCHORS.renterDetailPanel, placement: 'top' },
      { id: 'extend', anchor: ANCHORS.renterDetailExtend, placement: 'bottom', seed: { id: 'extend-lease', opens: 'extend-lease' }, optional: true },
      { id: 'end', anchor: ANCHORS.renterDetailEndLease, placement: 'bottom', seed: { id: 'end-lease', opens: null }, optional: true },
    ],
  },

  /**
   * The property equivalent, and the screen the properties-list tour has always advertised
   * — "open one for its lease, its tenant, and the money it has made" — while having nothing
   * to say once you got there.
   *
   * Three steps in a row point at the same anchor, which everywhere else in this file is a
   * bug: `forMonth` and `recording` once shared the add button and spotlighted it twice for
   * unrelated reasons. This is the opposite arrangement. The anchor is the tab *panel*, the
   * frame every tab renders into, and what changes between the steps is what is inside it —
   * the tour drives the tab, the way `properties-list` drives its card/table toggle. Holding
   * the spotlight still while the contents change is the point, not an accident of reuse.
   */
  'property-detail': {
    id: 'property-detail',
    route: '/properties/:id',
    gate: 'hasProperties',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'stats', anchor: ANCHORS.propertyDetailStats, placement: 'bottom' },
      { id: 'tabs', anchor: ANCHORS.propertyDetailTabs, placement: 'bottom' },
      { id: 'renters', anchor: ANCHORS.propertyDetailPanel, placement: 'top' },
      { id: 'payments', anchor: ANCHORS.propertyDetailPanel, placement: 'top' },
      { id: 'documents', anchor: ANCHORS.propertyDetailPanel, placement: 'top' },
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
    // `always`: this one fires when the user deliberately opens the panel, and both its
    // steps are about what the assistant is allowed to do rather than about any data. If
    // somebody opens it on their first day, telling them what it can and cannot see is
    // the answer to the question they just asked.
    gate: 'always',
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
    // Belt and braces: `cpiSelected` can never be true where the mode is not offered, so
    // this tour was already unreachable. Saying so explicitly means the next person does
    // not have to re-derive that chain to know why.
    requires: 'cpiLinkage',
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

  /**
   * `page`, not `elaboration`, along with the two below it: a form the user opens and works
   * through is a screen in every sense the ceiling cares about, and three steps was a budget
   * written for something that answers one question. `arrivesFrom` is unaffected by `kind`,
   * so the callback line from the `bulk-rent` seed still shows on the opening card.
   */
  'revenue-form': {
    id: 'revenue-form',
    route: '/transactions',
    gate: 'always',
    kind: 'page',
    arrivesFrom: 'bulk-rent',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      { id: 'scope', anchor: ANCHORS.revenuePropertyPicker, placement: 'bottom' },
      { id: 'period', anchor: ANCHORS.revenuePeriodPicker, placement: 'bottom' },
      // Optional because the renter rows do not exist until a property is picked, and this
      // tour has to be able to open before that — waiting on them is what kept it shut for
      // anyone who opened the form and simply looked at it. The fact that matters most, that
      // the amounts come from each contract, is said on `scope` above, which is anchored on a
      // field that is always there; this step is the override detail, worth having when the
      // rows happen to be up and not worth blocking the tour for.
      { id: 'perContract', anchor: ANCHORS.revenueAmountCell, placement: 'bottom', optional: true },
      { id: 'saving', anchor: null, placement: 'center' },
    ],
  },

  'expense-form': {
    id: 'expense-form',
    route: '/transactions',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
      // Screen order: the property picker is the first field on this form and the category
      // field sits four below it. These two were the other way round, so the tour jumped down
      // the form and back up again.
      { id: 'split', anchor: ANCHORS.expensePropertyPicker, placement: 'bottom', seed: { id: 'expense-split', opens: null } },
      { id: 'required', anchor: ANCHORS.expenseCategoryField, placement: 'bottom' },
    ],
  },

  'extend-lease': {
    id: 'extend-lease',
    route: '/renters/:id',
    gate: 'always',
    kind: 'page',
    arrivesFrom: 'extend-lease',
    steps: [
      { id: 'overview', anchor: null, placement: 'center' },
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

  /**
   * The add/edit supplier drawer. `page`, like the other forms, though it only spends three
   * of the eight steps a page tour may have — the form is five fields and most of them
   * explain themselves.
   *
   * It exists for the bank-account card. That is the one control in the product that looks
   * like it sets up a payment and does not: nothing in Rent Control ever moves money, and a
   * landlord who assumes otherwise finds out by a supplier not being paid. Everything else
   * here is the frame that step needs in order not to arrive cold.
   *
   * Categories before bank, which is the order this screen renders them — the reverse of
   * mobile's form. The registry follows its own platform's screen, not the other one's.
   */
  'supplier-form': {
    id: 'supplier-form',
    route: '/suppliers',
    gate: 'always',
    kind: 'page',
    steps: [
      { id: 'overview', anchor: ANCHORS.supplierFormName, placement: 'bottom' },
      { id: 'categories', anchor: ANCHORS.supplierFormCategories, placement: 'bottom' },
      { id: 'bank', anchor: ANCHORS.supplierFormBank, placement: 'top' },
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
      { id: 'cpiException', anchor: null, placement: 'center', requires: 'cpiLinkage' },
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
