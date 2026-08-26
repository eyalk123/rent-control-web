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
  // RESERVED: plumbed on all three nav variants, but first-run spends its steps elsewhere.
  navRenters: 'nav.renters',
  navTransactions: 'nav.transactions',
  // RESERVED: suppliers are introduced by a seed on the transactions tour, not a spotlight.
  navSuppliers: 'nav.suppliers',
  navReports: 'nav.reports',
  // RESERVED: nothing points at Settings; the Phase 7 replay control lives inside it.
  navSettings: 'nav.settings',

  // Home — src/features/home/
  homeNeedsAttention: 'home.needsAttention',
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
  propertiesSearch: 'properties.search',
  // RESERVED: the properties tour explains the cards, not the add control.
  propertiesAddButton: 'properties.addButton',
  propertyFormStepper: 'propertyForm.stepper', // -> shared/components/ui Stepper
  propertyFormOwnerField: 'propertyForm.ownerField',

  // Renters
  rentersList: 'renters.list',
  rentersEndedFilter: 'renters.endedFilter',
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
  transactionsList: 'transactions.list',
  // RESERVED: the `suppliers` seed names this in prose, but the seed is carried by the
  // transactions add-button step, so nothing points a spotlight at it. Web reaches
  // suppliers from the nav rather than a header button.
  transactionsSuppliersButton: 'transactions.suppliersButton',
  transactionsAddButton: 'transactions.addButton',
  revenuePropertyPicker: 'revenueForm.propertyPicker',
  // RESERVED: the revenue tour uses its three steps on scope, per-contract and saving.
  revenuePeriodPicker: 'revenueForm.periodPicker', // -> MonthGridPicker
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
  reportsExport: 'reports.exportButton',

  // Scan — src/features/document-scan/
  scanPicker: 'scan.picker',
  // RESERVED: the summary drawer only opens after an extraction, so the lease-scan tour
  // (which opens on the picker) cannot point at it — see registry.ts.
  scanSummary: 'scan.summary',

  // Assistant — src/layout/TopBar.tsx and src/features/agent/
  /** The launcher in the top bar. Absent when the account has no assistant, which is why
   *  the first-run step pointing at it is `optional` (see registry.ts). */
  chatLauncher: 'chat.launcher',
  /** The composer inside the panel. Same key string as mobile, so the vocabulary matches. */
  chatInput: 'chat.input',
} as const;

export type AnchorKey = (typeof ANCHORS)[keyof typeof ANCHORS];
