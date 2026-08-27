/**
 * Onboarding — anchor inventory (web).
 *
 * Every key here is an element a tour points at, *except* the handful marked RESERVED:
 * those name a real element (or, for the WhatsApp template keys, an element the web app
 * does not have yet) that no current tour step targets. They are kept rather than deleted
 * because each is something the copy already talks about and a future step is the obvious
 * use — but nothing plumbs a RESERVED key until a step points at it, so a reserved key is
 * not expected to appear in the DOM.
 *
 * Phase 1 plumbs each non-reserved one: the target component registers itself under this
 * key so the overlay can measure it. Nothing outside this file should invent an anchor
 * string.
 *
 * The `// -> file` comment on each entry is the component that must carry it.
 */
export const ANCHORS = {
  // Sidebar — src/layout/
  navHome: 'nav.home',
  navProperties: 'nav.properties',
  navRenters: 'nav.renters',
  navTransactions: 'nav.transactions',
  /** Sidebar only — the bottom bar hides Suppliers behind an unanchored "More" sheet, so
   *  the step pointing here is `optional` and drops below `lg`. Same for Reports. */
  navSuppliers: 'nav.suppliers',
  navReports: 'nav.reports',
  // RESERVED: nothing points at Settings; the Phase 7 replay control lives inside it.
  navSettings: 'nav.settings',

  // Home — src/features/home/ (the home sweep walks these in render order)
  homeSummaryCards: 'home.summaryCards', // net profit + cash flow, the pair at the top
  homeQuickActions: 'home.quickActions',
  homeNeedsAttention: 'home.needsAttention',
  /** "Manage notifications", inline beside the Needs Attention label. Same key name as
   *  mobile, where it sits in the same place. */
  homeManageNotifications: 'home.manageNotifications',
  homeOccupancy: 'home.occupancy',
  homeRecent: 'home.recent',
  homeNotificationsBell: 'home.notificationsBell', // web-only bell panel

  // Properties
  /**
   * The FIRST item in the list, not the list itself — claimed by the first card in card
   * view and the first row in table view. Only one of those is ever mounted, and the
   * registry resolves visible-first, so a single key covers both without branching.
   *
   * It used to be a wrapper around the whole content region. With a few hundred
   * properties that rect was thousands of pixels tall, which put the highlight and the
   * card off-screen and left the step invisible. Point at one item, not the collection.
   */
  propertiesList: 'properties.list',
  propertiesHeaderMeta: 'properties.headerMeta', // the count/occupied/monthly summary line
  propertiesAddButton: 'properties.addButton',   // the Add menu (add by hand / scan a lease)
  propertiesSelect: 'properties.select',         // enters multi-select
  propertiesSearch: 'properties.search',
  /** The cards/table toggle. Inside `hidden lg:flex`, so it is absent on a narrow viewport
   *  — which is exactly where the table cannot render either. The step that points here is
   *  `optional`, so it drops itself at the width where it would be a lie. */
  propertiesViewToggle: 'properties.viewToggle',
  propertyFormStepper: 'propertyForm.stepper', // -> shared/components/ui Stepper
  propertyFormOwnerField: 'propertyForm.ownerField',
  /** The whole of the form's second page — bills, meter numbers, contract files. One
   *  anchor for the group rather than one per field: the tour has a single thing to say
   *  about all of it, which is that none of it is required and all of it feeds the
   *  expense side later. Unmounted while page one shows, so the step is `revealsAnchor`
   *  and the drawer flips the page for it. */
  propertyFormRecords: 'propertyForm.records',

  // Renters
  rentersList: 'renters.list',
  rentersHeaderMeta: 'renters.headerMeta',
  rentersAddButton: 'renters.addButton',
  rentersSelect: 'renters.select',
  rentersEndedFilter: 'renters.endedFilter', // the status tabs — 'Ended' is the seed target
  rentersSearch: 'renters.search',
  /** Same story as `propertiesViewToggle`. */
  rentersViewToggle: 'renters.viewToggle',
  /** Payment day, type and frequency, as one group on the renter form's lease page. The
   *  payment day is what 'overdue' is counted from, which nothing else in the product
   *  says out loud. Also `revealsAnchor` — see `propertyFormRecords`. */
  renterFormPayment: 'renterForm.payment',
  renterDetailTimeline: 'renterDetail.timeline', // -> RenterLeaseInfoDisplayCard
  renterDetailExtend: 'renterDetail.extendButton',
  renterDetailEndLease: 'renterDetail.endLeaseButton', // -> EndLeaseDialog trigger

  // Lease form — src/shared/components/ui/ + feature forms
  leaseTermBuilder: 'leaseForm.termBuilder', // -> LeaseTermBuilder.tsx
  leaseRentChangeField: 'leaseForm.rentChangeField', // -> RentChangeField.tsx
  leaseBaseRent: 'leaseForm.baseRent',
  leaseYearRows: 'leaseForm.yearRows', // -> LeaseYearRow.tsx
  leaseCpiBase: 'leaseForm.cpiBase', // -> RentChangeField.tsx, the CPI explainer

  // Extend lease — src/features/renters/ (extend drawer)
  extendYearsStepper: 'extendLease.yearsStepper',
  extendPreview: 'extendLease.preview',

  // Transactions — src/features/transactions/
  /**
   * The FIRST month's rows, not the whole scrolling list — the same lesson as
   * `propertiesList` above: a wrapper around every transaction is thousands of pixels
   * tall on a real account, and a spotlight that size highlights nothing.
   *
   * It also means the anchor exists only once rows are on screen, so the tour waits for
   * content instead of opening over a spinner, and defers entirely on an account with no
   * transactions yet. That is the gate's own intent — a money screen with nothing in it
   * teaches nothing — and it is what mobile already does.
   */
  transactionsList: 'transactions.list',
  transactionsHero: 'transactions.hero',     // cash-flow chart + the KPI tiles beside it
  transactionsFilter: 'transactions.filter', // all / money in / money out
  /** The "March 2026" heading above those rows. Only the first month claims the key —
   *  it is the grouping the tour points at, not that particular month. */
  transactionsMonthHeader: 'transactions.monthHeader',
  // RESERVED: the `suppliers` seed names this in prose, but the seed is carried by the
  // transactions add-button step, so nothing points a spotlight at it. Web reaches
  // suppliers from the nav rather than a header button.
  transactionsSuppliersButton: 'transactions.suppliersButton',
  transactionsAddButton: 'transactions.addButton',
  revenuePropertyPicker: 'revenueForm.propertyPicker',
  /** One month / chosen months / a contract year. The `period` step points here — it was
   *  reserved while the revenue tour had only three steps to spend. */
  revenuePeriodPicker: 'revenueForm.periodPicker', // -> the period SegToggle + its picker
  revenueAmountCell: 'revenueForm.amountCell', // "Per contract" / Override / Auto
  expenseCategoryField: 'expenseForm.categoryField', // -> CategoryMultiPickerField.tsx
  expensePropertyPicker: 'expenseForm.propertyPicker',

  // Suppliers — src/features/suppliers/
  suppliersList: 'suppliers.list',
  suppliersCategories: 'suppliers.categories',

  // Notifications — src/features/notifications/
  notificationsEventList: 'notifications.eventList',
  notificationsRulesEntry: 'notifications.rulesEntry',
  // RESERVED: the web app has no WhatsApp template editor — the screen is mobile-only, so
  // the notifications tour drops its templates step here. See registry.ts.
  notificationsTemplatesEntry: 'notifications.templatesEntry',
  ruleOffsets: 'rule.offsets',
  ruleScope: 'rule.scope',
  // RESERVED (both): no template editor on web — see notificationsTemplatesEntry above.
  templatePlaceholders: 'templates.placeholderChips',
  templateLanguage: 'templates.languageSwitch',

  // Reports — src/features/reports/
  reportsCards: 'reports.cards',
  /** The export history list. The hub has no export button of its own — exports are made
   *  inside a report and land here. */
  reportsExport: 'reports.exportButton',

  // Scan — src/features/document-scan/
  scanPicker: 'scan.picker',
  // RESERVED: the summary drawer only opens after an extraction, so the lease-scan tour
  // (which opens on the picker) cannot point at it — see registry.ts.
  scanSummary: 'scan.summary',

  // Alerts — src/features/alerts/AlertsPanel.tsx
  /** RESERVED: "Manage notifications" at the foot of the alerts panel. Still plumbed,
   *  but no step points at it — reminder settings are now reachable from the Home
   *  screen itself (`homeManageNotifications`), which is what the home tour spotlights
   *  and what mobile has always done. This one stays for the reader who is already in
   *  the panel. */
  alertsSettingsButton: 'alerts.settingsButton',

  // Assistant — src/layout/TopBar.tsx and src/features/agent/
  /** The launcher in the top bar. Absent when the account has no assistant, which is why
   *  the first-run step pointing at it is `optional` (see registry.ts). */
  chatLauncher: 'chat.launcher',
  /** The composer inside the panel. Same key string as mobile, so the vocabulary matches. */
  chatInput: 'chat.input',
} as const;

export type AnchorKey = (typeof ANCHORS)[keyof typeof ANCHORS];
