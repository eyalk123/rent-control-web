/**
 * Onboarding — content registry (web).
 *
 * Same schema and the same tour/seed IDs as mobile, so copy is shared and a user who
 * saw a tour on the phone does not see it again here. It diverges only where the
 * navigation genuinely differs:
 *   - no Chat tab (no `chat` tour);
 *   - Suppliers and Reports are top-level sidebar entries, not nested, so their seeds
 *     move from Transactions/Home onto the sidebar step;
 *   - alerts also live in a bell panel, which the Home tour points at.
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
      { id: 'home', anchor: ANCHORS.navHome, placement: 'end', seed: { id: 'alert-actions', opens: null } },
      { id: 'portfolio', anchor: ANCHORS.navProperties, placement: 'end', seed: { id: 'scan-lease', opens: 'lease-scan' } },
      { id: 'money', anchor: ANCHORS.navTransactions, placement: 'end', seed: { id: 'suppliers', opens: 'suppliers' } },
      { id: 'start', anchor: null, placement: 'center' },
    ],
  },

  /**
   * Reports could be seeded from the sidebar on web, but that would put a fourth seed in
   * first-run. It waits here with notifications instead — same shape as mobile, and both
   * land once Home has data to make them mean something.
   */
  home: {
    id: 'home',
    route: '/home',
    gate: 'hasRenters',
    kind: 'page',
    steps: [
      { id: 'attention', anchor: ANCHORS.homeNeedsAttention, placement: 'bottom' },
      { id: 'bell', anchor: ANCHORS.homeNotificationsBell, placement: 'bottom', seed: { id: 'notifications', opens: 'notifications' } },
      { id: 'reports', anchor: ANCHORS.navReports, placement: 'end', seed: { id: 'reports', opens: 'reports' } },
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
      { id: 'persistence', anchor: ANCHORS.propertiesList, placement: 'bottom', seed: { id: 'bulk-select', opens: null } },
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

  suppliers: {
    id: 'suppliers',
    route: '/suppliers',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'suppliers',
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
      { id: 'templates', anchor: ANCHORS.notificationsTemplatesEntry, placement: 'bottom', seed: { id: 'whatsapp-templates', opens: 'whatsapp-templates' } },
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

  'whatsapp-templates': {
    id: 'whatsapp-templates',
    route: '/settings/notifications',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'whatsapp-templates',
    steps: [
      { id: 'placeholders', anchor: ANCHORS.templatePlaceholders, placement: 'bottom' },
      { id: 'perLanguage', anchor: ANCHORS.templateLanguage, placement: 'bottom' },
    ],
  },

  reports: {
    id: 'reports',
    route: '/reports',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'reports',
    steps: [
      { id: 'two', anchor: ANCHORS.reportsCards, placement: 'bottom' },
      { id: 'export', anchor: ANCHORS.reportsExport, placement: 'bottom' },
    ],
  },

  'lease-scan': {
    id: 'lease-scan',
    route: '/properties',
    gate: 'always',
    kind: 'elaboration',
    arrivesFrom: 'scan-lease',
    steps: [
      { id: 'pick', anchor: ANCHORS.scanPicker, placement: 'bottom' },
      { id: 'review', anchor: ANCHORS.scanSummary, placement: 'bottom' },
      { id: 'both', anchor: null, placement: 'center' },
    ],
  },
} satisfies Partial<Record<TourId, TourDefinition>>;

export type WebTourId = keyof typeof TOURS;

/** Run in a unit test — keeps the budget from quietly drifting as copy is added. */
export function validateRegistry(): string[] {
  return Object.values(TOURS as Record<string, TourDefinition>).flatMap(assertBudget);
}
