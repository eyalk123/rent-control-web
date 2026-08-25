/**
 * Onboarding — anchor inventory (web).
 *
 * Every key here is an element a tour points at. Phase 1 plumbs each one: the target
 * component registers itself under this key so the overlay can measure it. Nothing
 * outside this file should invent an anchor string.
 *
 * The `// -> file` comment on each entry is the component that must carry it.
 */
export const ANCHORS = {
  // Sidebar — src/layout/
  navHome: 'nav.home',
  navProperties: 'nav.properties',
  navRenters: 'nav.renters',
  navTransactions: 'nav.transactions',
  navSuppliers: 'nav.suppliers',
  navReports: 'nav.reports',
  navSettings: 'nav.settings',

  // Home — src/features/home/
  homeNeedsAttention: 'home.needsAttention',
  homeNotificationsBell: 'home.notificationsBell', // web-only bell panel

  // Properties
  propertiesList: 'properties.list',
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
  transactionsSuppliersButton: 'transactions.suppliersButton', // -> SuppliersHeaderButton.tsx
  transactionsAddButton: 'transactions.addButton',
  revenuePropertyPicker: 'revenueForm.propertyPicker',
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
  notificationsTemplatesEntry: 'notifications.templatesEntry',
  ruleOffsets: 'rule.offsets',
  ruleScope: 'rule.scope',
  templatePlaceholders: 'templates.placeholderChips',
  templateLanguage: 'templates.languageSwitch',

  // Reports — src/features/reports/
  reportsCards: 'reports.cards',
  reportsExport: 'reports.exportButton',

  // Scan — src/features/document-scan/
  scanPicker: 'scan.picker',
  scanSummary: 'scan.summary',
} as const;

export type AnchorKey = (typeof ANCHORS)[keyof typeof ANCHORS];
