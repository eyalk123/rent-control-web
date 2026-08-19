import { getRenterLifecycle } from '@/shared/utils/renterStatus';
import type {
  Property,
  PropertyBrief,
  PropertyCreate,
  PropertyUpdate,
  Renter,
  RenterCreate,
  RenterUpdate,
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  ExpenseCategory,
  ExpenseCategoryCreate,
  Transaction,
  PropertyRenterSummary,
} from '@/shared/types';
import { getLeaseEndDate } from '@/shared/types';
import type { LeaseExtraction } from '@/features/document-scan/types';
import type {
  AgentStatus,
  ConversationDetail,
  ConversationSummary,
  StoredMessage,
} from '@/features/agent/types';
import type { StreamChatArgs } from '@/features/agent/api/agentStream';

// Set to true to use in-memory mock data when no backend is available.
// Driven by VITE_USE_MOCK_API so E2E (and offline dev) can opt in without a code change.
// Defaults to false when the var is unset, so production behavior is unchanged.
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Artificial latency for mock reads, in milliseconds, read per-call from
 * `window.__mockLatencyMs`. Zero (the default) unless a test sets it.
 *
 * The mock answers in-process, so every read resolves inside the same frame as the write
 * that triggered it. That hides a whole class of bug where the UI flips state off a mutation
 * before the cache has caught up — a just-recorded rent month flashed back to red before
 * turning green, and no zero-latency test could see it. Only reachable under
 * `USE_MOCK_API`, so it cannot affect a real build.
 */
export function mockLatency(): Promise<void> {
  const ms = Number((globalThis as { __mockLatencyMs?: number }).__mockLatencyMs) || 0;
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function toPropertyBrief(p: Property): PropertyBrief {
  return { id: p.id, address: p.address, city: p.city, type: p.type };
}

const seedProperties: Property[] = [
  {
    id: 1,
    owner_id: 1,
    address: '123 Main St',
    city: 'Austin',
    zip_code: '78701',
    type: 'house',
    sq_ft: 2200,
    image_url: null,
    number_of_rooms: 5,
    parking_numbers: ['A-12', 'B-34'],
    electricity_meter_number: 'EM-001',
    electricity_account_number: null,
    water_meter_number: 'WM-001',
    water_account_number: null,
    property_tax: 4500,
    house_committee: 200,
    property_owner: 'Jane Cooper',
    renters: null,
  },
  {
    id: 2,
    owner_id: 1,
    address: '456 Oak Avenue',
    city: 'Austin',
    zip_code: '78702',
    type: 'apartment',
    sq_ft: 1200,
    image_url: null,
    number_of_rooms: 3,
    parking_numbers: null,
    electricity_meter_number: null,
    electricity_account_number: null,
    water_meter_number: null,
    water_account_number: null,
    property_tax: 2800,
    house_committee: 150,
    renters: null,
  },
  {
    id: 3,
    owner_id: 1,
    address: '789 Elm Street',
    city: 'Austin',
    zip_code: '78703',
    type: 'apartment',
    sq_ft: 950,
    image_url: null,
    renters: null,
  },
  {
    id: 4,
    owner_id: 1,
    address: '321 Pine Road',
    city: 'Round Rock',
    zip_code: '78664',
    type: 'house',
    sq_ft: 1800,
    image_url: null,
    renters: null,
  },
  {
    id: 5,
    owner_id: 1,
    address: '555 Cedar Lane',
    city: 'Austin',
    zip_code: '78704',
    type: 'commercial',
    sq_ft: 1500,
    image_url: null,
    renters: null,
  },
];

const seedRenters: Renter[] = [
  {
    id: 1,
    property_id: 1,
    first_name: 'Sarah',
    last_name: 'Johnson',
    phone: '512-555-0101',
    email: 'sarah.johnson@email.com',
    lease_years: [{ amount: 26400, type: 'contract' }],
    lease_start: '2025-06-15',
    number_of_payments: 12,
    payment_type: 'wire_transfer',
    payment_day_of_month: 1,
    insurance_type: 'tenant',
    insurance_amount: 150,
    property: null,
    contact_id: null,
  },
  {
    id: 2,
    property_id: 1,
    first_name: 'Michael',
    last_name: 'Chen',
    phone: '512-555-0102',
    email: 'michael.chen@email.com',
    lease_years: [
      { amount: 22800, type: 'contract' },
      { amount: 23500, type: 'contract' },
    ],
    lease_start: '2025-07-22',
    number_of_payments: 12,
    payment_type: 'wire_transfer',
    payment_day_of_month: 15,
    property: null,
    contact_id: null,
  },
  {
    id: 3,
    property_id: 2,
    first_name: 'Emily',
    last_name: 'Davis',
    phone: '512-555-0103',
    email: 'emily.davis@email.com',
    lease_years: [
      { amount: 19800, type: 'contract' },
      { amount: 20400, type: 'contract' },
      { amount: 21000, type: 'contract' },
    ],
    lease_start: '2024-02-01',
    property: null,
    contact_id: null,
  },
  {
    id: 4,
    property_id: 3,
    first_name: 'James',
    last_name: 'Wilson',
    phone: '512-555-0104',
    email: 'james.wilson@email.com',
    lease_years: [
      { amount: 25200, type: 'contract' },
      { amount: 25900, type: 'contract' },
      { amount: 26600, type: 'contract' },
    ],
    lease_start: '2024-04-15',
    property: null,
    contact_id: null,
  },
  {
    id: 5,
    property_id: null,
    first_name: 'Lisa',
    last_name: 'Martinez',
    phone: '512-555-0105',
    email: 'lisa.martinez@email.com',
    lease_years: [],
    lease_start: '',
    property: null,
    contact_id: null,
  },
  {
    id: 6,
    property_id: 4,
    first_name: 'Robert',
    last_name: 'Thompson',
    phone: '512-555-0106',
    email: 'robert.thompson@email.com',
    lease_years: [
      { amount: 23400, type: 'contract' },
      { amount: 24100, type: 'contract' },
      { amount: 24800, type: 'contract' },
    ],
    lease_start: '2024-05-01',
    property: null,
    contact_id: null,
  },
  {
    // CPI-linked lease. Amounts are the ones the *server* would have materialized: the
    // started years resolved against their own published index, while the years that
    // haven't begun all fall back to the latest known index — which is why they repeat.
    // Unlinked from any property on purpose: several property-scoped tests assert an exact
    // renter roster (e.g. "property #2 has only Emily Davis"), and these fixtures exist for
    // the lease timeline, which doesn't care about the property.
    id: 7,
    property_id: null,
    first_name: 'Noa',
    last_name: 'Levi',
    phone: '512-555-0107',
    email: 'noa.levi@email.com',
    lease_years: [
      { amount: 24000, type: 'contract' },
      { amount: 24600, type: 'contract' },
      { amount: 25080, type: 'option' },
      { amount: 25080, type: 'option' },
    ],
    lease_start: '2024-09-01',
    base_rent: 24000,
    rent_escalation_mode: 'cpi',
    property: null,
    contact_id: null,
  },
  {
    // `custom` schedule whose CPI rule starts mid-lease — only the years from that rule on
    // are index-dependent, and only the ones still in the future are projections.
    id: 8,
    property_id: null,
    first_name: 'Daniel',
    last_name: 'Katz',
    phone: '512-555-0108',
    email: 'daniel.katz@email.com',
    lease_years: [
      { amount: 30000, type: 'contract' },
      { amount: 31500, type: 'contract', rule: { mode: 'percent', value: 5 } },
      { amount: 32130, type: 'option', rule: { mode: 'cpi' } },
      { amount: 32130, type: 'option', rule: { mode: 'cpi' } },
    ],
    lease_start: '2024-11-01',
    base_rent: 30000,
    rent_escalation_mode: 'custom',
    property: null,
    contact_id: null,
  },
  {
    // Legacy shape: only the final option year is CPI-linked, and `rent_escalation_mode`
    // was never persisted (it is nullable in the API response). The per-year rule alone has
    // to be enough to mark the year — gating on the mode used to hide it entirely.
    id: 9,
    property_id: null,
    first_name: 'Yael',
    last_name: 'Bar',
    phone: '512-555-0109',
    email: 'yael.bar@email.com',
    lease_years: [
      { amount: 40000, type: 'contract' },
      { amount: 40000, type: 'contract' },
      { amount: 41000, type: 'option', rule: { mode: 'cpi' } },
    ],
    lease_start: '2024-12-01',
    property: null,
    contact_id: null,
  },
];

const seedExpenseCategories: ExpenseCategory[] = [
  { id: 1, key: 'maintenance', is_active: true, sort_order: 1 },
  { id: 2, key: 'electricity', is_active: true, sort_order: 2 },
  { id: 3, key: 'water', is_active: true, sort_order: 3 },
  { id: 4, key: 'repairs', is_active: true, sort_order: 4 },
  { id: 5, key: 'other', is_active: true, sort_order: 5 },
];

const seedSuppliers: Supplier[] = [
  {
    id: 1,
    category_ids: [1, 4],
    name: 'Joe Plumber',
    phone: '512-555-1001',
    email: 'joe@plumber.com',
    notes: null,
    bank_account: null,
    is_active: true,
  },
  {
    id: 2,
    category_ids: [2],
    name: 'City Power Co',
    phone: '512-555-2000',
    email: null,
    notes: null,
    bank_account: null,
    is_active: true,
  },
  {
    id: 3,
    category_ids: [3],
    name: 'Water Utility',
    phone: null,
    email: 'billing@water.com',
    notes: 'Monthly billing',
    bank_account: null,
    is_active: true,
  },
];

const seedTransactions: Transaction[] = [
  {
    id: 1,
    type: 'revenue',
    property_id: 1,
    renter_id: 1,
    payment_method: 'bank_transfer',
    date_of_payment: '2026-03-01',
    month_for: '2026-03-01',
    amount: 2200,
    currency_code: 'ILS',
    category_id: null,
    supplier_id: null,
    notes: null,
    property_name: '123 Main St',
    renter_name: 'Sarah Johnson',
    category_name: null,
    supplier_name: null,
  },
  {
    id: 2,
    type: 'revenue',
    property_id: 1,
    renter_id: 2,
    payment_method: 'bit',
    date_of_payment: '2026-03-15',
    month_for: '2026-03-01',
    amount: 1900,
    currency_code: 'ILS',
    category_id: null,
    supplier_id: null,
    notes: null,
    property_name: '123 Main St',
    renter_name: 'Michael Chen',
    category_name: null,
    supplier_name: null,
  },
  {
    id: 3,
    type: 'revenue',
    property_id: 2,
    renter_id: 3,
    payment_method: 'cash',
    date_of_payment: '2026-03-01',
    month_for: '2026-03-01',
    amount: 1650,
    currency_code: 'ILS',
    category_id: null,
    supplier_id: null,
    notes: null,
    property_name: '456 Oak Avenue',
    renter_name: 'Emily Davis',
    category_name: null,
    supplier_name: null,
  },
  {
    id: 4,
    type: 'expense',
    property_id: 1,
    renter_id: null,
    payment_method: 'bank_transfer',
    date_of_payment: '2026-03-05',
    month_for: null,
    amount: 350,
    currency_code: 'ILS',
    category_id: 1,
    supplier_id: 1,
    notes: 'Leaky faucet repair',
    property_name: '123 Main St',
    renter_name: null,
    category_name: 'maintenance',
    supplier_name: 'Joe Plumber',
  },
  {
    id: 5,
    type: 'expense',
    property_id: 2,
    renter_id: null,
    payment_method: 'bank_transfer',
    date_of_payment: '2026-03-10',
    month_for: null,
    amount: 120,
    currency_code: 'ILS',
    category_id: 2,
    supplier_id: 2,
    notes: null,
    property_name: '456 Oak Avenue',
    renter_name: null,
    category_name: 'electricity',
    supplier_name: 'City Power Co',
  },
  {
    id: 6,
    type: 'expense',
    property_id: 3,
    renter_id: null,
    payment_method: 'bank_transfer',
    date_of_payment: '2026-03-10',
    month_for: null,
    amount: 75,
    currency_code: 'ILS',
    category_id: 3,
    supplier_id: 3,
    notes: 'Monthly water bill',
    property_name: '789 Elm Street',
    renter_name: null,
    category_name: 'water',
    supplier_name: 'Water Utility',
  },
];

let mockProperties: Property[] = [...seedProperties];
let mockRenters: Renter[] = [...seedRenters];
const mockExpenseCategories: ExpenseCategory[] = [...seedExpenseCategories];
const mockSuppliers: Supplier[] = [...seedSuppliers];
let mockTransactions: Transaction[] = [...seedTransactions];
let nextPropertyId = 6;
// Derived, not hardcoded: adding a seed renter used to silently collide with the first
// id handed out by createRenter, which React surfaced as a duplicate-key warning.
let nextRenterId = Math.max(...seedRenters.map((r) => r.id)) + 1;
let nextCategoryId = 6;
let nextSupplierId = 4;
let nextTransactionId = 7;

export const mockPropertiesApi = {
  getProperties: async (): Promise<Property[]> => {
    return mockProperties.map((p) => ({
      ...p,
      renters: mockRenters.filter((r) => r.property_id === p.id).map((r) => ({
        ...r,
        property: toPropertyBrief(p),
      })),
    }));
  },
  getPropertyById: async (id: number): Promise<Property> => {
    const p = mockProperties.find((x) => x.id === id);
    if (!p) throw new Error('Property not found');
    const renters = mockRenters.filter((r) => r.property_id === id).map((r) => ({
      ...r,
      property: toPropertyBrief(p),
    }));
    return { ...p, renters };
  },
  createProperty: async (data: PropertyCreate | Partial<Property>): Promise<Property> => {
    const newProp: Property = {
      id: nextPropertyId++,
      owner_id: 0,
      address: data.address ?? '',
      city: data.city ?? '',
      zip_code: data.zip_code ?? '',
      type: (data.type ?? 'apartment') as Property['type'],
      sq_ft: data.sq_ft ?? 0,
      image_url: data.image_url ?? null,
      number_of_rooms: data.number_of_rooms ?? null,
      parking_numbers: data.parking_numbers ?? null,
      electricity_meter_number: data.electricity_meter_number ?? null,
      electricity_account_number: data.electricity_account_number ?? null,
      water_meter_number: data.water_meter_number ?? null,
      water_account_number: data.water_account_number ?? null,
      property_tax: data.property_tax ?? null,
      house_committee: data.house_committee ?? null,
      property_owner: data.property_owner ?? null,
      renters: [],
    };
    mockProperties.push(newProp);
    return { ...newProp };
  },
  updateProperty: async (id: number, data: PropertyUpdate | Partial<Property>): Promise<Property> => {
    const idx = mockProperties.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Property not found');
    const { renters: _r, ...rest } = data as Partial<Property> & { renters?: unknown };
    mockProperties[idx] = { ...mockProperties[idx], ...rest };
    return mockPropertiesApi.getPropertyById(id);
  },
  deleteProperty: async (id: number): Promise<void> => {
    mockProperties = mockProperties.filter((x) => x.id !== id);
    mockRenters = mockRenters.map((r) =>
      r.property_id === id ? { ...r, property_id: null, property: null } : r
    );
  },
};

export const mockRentersApi = {
  getRenters: async (): Promise<Renter[]> => {
    return mockRenters.map((r) => {
      const prop = r.property_id
        ? mockProperties.find((p) => p.id === r.property_id)
        : null;
      return {
        ...r,
        property: prop ? toPropertyBrief(prop) : null,
      };
    });
  },
  getRenterById: async (id: number): Promise<Renter> => {
    const r = mockRenters.find((x) => x.id === id);
    if (!r) throw new Error('Renter not found');
    const prop = r.property_id ? mockProperties.find((p) => p.id === r.property_id) : null;
    return {
      ...r,
      property: prop ? toPropertyBrief(prop) : null,
    };
  },
  createRenter: async (data: RenterCreate | Partial<Renter>): Promise<Renter> => {
    const newRenter: Renter = {
      id: nextRenterId++,
      property_id: data.property_id ?? null,
      first_name: data.first_name ?? '',
      last_name: data.last_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      lease_years: (data as RenterCreate).lease_years ?? (data as Renter).lease_years ?? [],
      lease_start: data.lease_start ?? '',
      contract_term_years: data.contract_term_years ?? null,
      option_years: data.option_years ?? null,
      base_rent: data.base_rent ?? null,
      rent_escalation_mode: data.rent_escalation_mode ?? null,
      rent_escalation_value: data.rent_escalation_value ?? null,
      number_of_payments: data.number_of_payments ?? null,
      payment_type: data.payment_type ?? null,
      payment_day_of_month: data.payment_day_of_month ?? null,
      insurance_type: data.insurance_type ?? null,
      insurance_amount: data.insurance_amount ?? null,
      property: null,
      contact_id: (data as RenterCreate).contact_id ?? (data as Renter).contact_id ?? null,
      extra_contacts: (data as RenterCreate).extra_contacts ?? (data as Renter).extra_contacts ?? null,
    };
    mockRenters.push(newRenter);
    return mockRentersApi.getRenterById(newRenter.id);
  },
  updateRenter: async (id: number, data: RenterUpdate | Partial<Renter>): Promise<Renter> => {
    const idx = mockRenters.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Renter not found');
    mockRenters[idx] = { ...mockRenters[idx], ...data };
    return mockRentersApi.getRenterById(id);
  },
  deleteRenter: async (id: number): Promise<void> => {
    mockRenters = mockRenters.filter((x) => x.id !== id);
  },
  terminateLease: async (
    id: number,
    data: { terminated_on: string; reason?: string | null }
  ): Promise<Renter> => {
    const idx = mockRenters.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Renter not found');
    // Mirrors the server: only the two termination columns move. lease_years and
    // cpi_base_index are left exactly as they are.
    mockRenters[idx] = {
      ...mockRenters[idx],
      terminated_on: data.terminated_on,
      termination_reason: data.reason ?? null,
    };
    return mockRentersApi.getRenterById(id);
  },
  undoTermination: async (id: number): Promise<Renter> => {
    const idx = mockRenters.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Renter not found');
    mockRenters[idx] = { ...mockRenters[idx], terminated_on: null, termination_reason: null };
    return mockRentersApi.getRenterById(id);
  },
};

export const mockExpenseCategoriesApi = {
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    return [...mockExpenseCategories];
  },
  createExpenseCategory: async (data: ExpenseCategoryCreate): Promise<ExpenseCategory> => {
    const newCat: ExpenseCategory = {
      id: nextCategoryId++,
      name: data.name,
      is_active: true,
      sort_order: mockExpenseCategories.length,
    };
    mockExpenseCategories.push(newCat);
    return { ...newCat };
  },
};

// Fill the denormalized display fields (property_name, renter_name, etc.) from the
// other mock collections, mirroring what the real backend returns on a transaction.
function enrichTransaction(t: Transaction): Transaction {
  const prop = mockProperties.find((p) => p.id === t.property_id);
  const renter = t.renter_id != null ? mockRenters.find((r) => r.id === t.renter_id) : null;
  const cat = t.category_id != null ? mockExpenseCategories.find((c) => c.id === t.category_id) : null;
  const supplier = t.supplier_id != null ? mockSuppliers.find((s) => s.id === t.supplier_id) : null;
  return {
    ...t,
    property_name: prop?.address ?? t.property_name ?? '',
    renter_name: renter ? `${renter.first_name} ${renter.last_name}`.trim() : t.renter_name ?? null,
    category_name: cat ? cat.name ?? cat.key ?? null : t.category_name ?? null,
    supplier_name: supplier?.name ?? t.supplier_name ?? null,
  };
}

export const mockTransactionsApi = {
  getTransactions: async (params: {
    type?: 'revenue' | 'expense';
    propertyId?: number;
    renterId?: number;
    search?: string;
  } = {}): Promise<Transaction[]> => {
    let list = mockTransactions.map(enrichTransaction);
    if (params.type) {
      list = list.filter((t) => t.type === params.type);
    }
    if (params.propertyId != null) {
      list = list.filter((t) => t.property_id === params.propertyId);
    }
    if (params.renterId != null) {
      list = list.filter((t) => t.renter_id === params.renterId);
    }
    if (params.search?.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((t) =>
        (t.property_name ?? '').toLowerCase().includes(q) ||
        (t.renter_name ?? '').toLowerCase().includes(q) ||
        (t.category_name ?? '').toLowerCase().includes(q) ||
        (t.supplier_name ?? '').toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  },
  getTransactionById: async (id: number): Promise<Transaction> => {
    const t = mockTransactions.find((x) => x.id === id);
    if (!t) throw new Error('Transaction not found');
    return enrichTransaction(t);
  },
  // Persist a new transaction and return it enriched (mirrors the real POST response).
  addTransaction: (t: Omit<Transaction, 'id'>): Transaction => {
    const created: Transaction = { ...(t as Transaction), id: nextTransactionId++ };
    mockTransactions.push(created);
    return enrichTransaction(created);
  },
  updateTransaction: async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
    const idx = mockTransactions.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Transaction not found');
    mockTransactions[idx] = { ...mockTransactions[idx], ...data, id };
    return enrichTransaction(mockTransactions[idx]);
  },
  deleteTransaction: async (id: number): Promise<void> => {
    mockTransactions = mockTransactions.filter((x) => x.id !== id);
  },
  // 6-month buckets (oldest → newest, ending with the current month) computed from
  // the in-memory transactions, so the Reports pages render real data under mock mode.
  getSummary: async () => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const inMonth = (dateStr: string | null) => {
        if (!dateStr) return false;
        const dt = new Date(dateStr);
        return dt.getFullYear() === year && dt.getMonth() + 1 === month;
      };
      const revenue = mockTransactions
        .filter((t) => t.type === 'revenue' && inMonth(t.date_of_payment))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = mockTransactions
        .filter((t) => t.type === 'expense' && inMonth(t.date_of_payment))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      buckets.push({
        key: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        revenue,
        expenses,
        profit: revenue - expenses,
      });
    }
    // Year-to-date net per property owner, mirroring the backend: revenue counts
    // under month_for when set, expenses under date_of_payment; a transaction with
    // no (or a deleted) property is unattributed.
    const ytdYear = now.getFullYear();
    const ytdTotals = new Map<string | null, { revenue: number; expenses: number }>();
    for (const t of mockTransactions) {
      const effective = t.type === 'revenue' ? (t.month_for ?? t.date_of_payment) : t.date_of_payment;
      if (!effective || !effective.startsWith(String(ytdYear))) continue;
      const owner =
        mockProperties.find((p) => p.id === t.property_id)?.property_owner?.trim() || null;
      const bucket = ytdTotals.get(owner) ?? { revenue: 0, expenses: 0 };
      bucket[t.type === 'revenue' ? 'revenue' : 'expenses'] += Number(t.amount);
      ytdTotals.set(owner, bucket);
    }
    const ytdByOwner = [...ytdTotals.entries()]
      .map(([owner, { revenue, expenses }]) => ({ owner, revenue, expenses, net: revenue - expenses }))
      .sort((a, b) => b.net - a.net);

    return {
      six_month_buckets: buckets,
      ytd_year: ytdYear,
      ytd_net: ytdByOwner.reduce((sum, o) => sum + o.net, 0),
      ytd_by_owner: ytdByOwner,
    };
  },
  getPropertyRenters: async (
    propertyId: number,
    includeEnded = false
  ): Promise<PropertyRenterSummary[]> => {
    return mockRenters
      .filter((r) => r.property_id === propertyId)
      .map((r) => ({ renter: r, ended: getRenterLifecycle(r) === 'ended' }))
      // Mirrors the server: active leases only unless the caller asks for the rest.
      .filter(({ ended }) => includeEnded || !ended)
      .map(({ renter: r, ended }) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        monthly_rent: r.lease_years?.[0]?.amount ?? 0,
        is_ended: ended,
        lease_start: r.lease_start ?? null,
        lease_years: r.lease_years ?? [],
      }));
  },
};

export const mockHomeApi = {
  getOverdueRenters: async (params?: { property_owner?: string }) => {
    const today = new Date();
    return mockRenters
      .filter((r) => r.property_id != null)
      .filter((r) => !params?.property_owner || mockProperties.find((p) => p.id === r.property_id)?.property_owner === params.property_owner)
      .map((r) => {
        const prop = mockProperties.find((p) => p.id === r.property_id);
        const monthly = r.lease_years?.[0]?.amount ? Math.round(r.lease_years[0].amount / 12) : 0;
        const payDay = r.payment_day_of_month ?? 1;
        const daysOverdue = today.getDate() > payDay ? today.getDate() - payDay : 0;
        return {
          renter_id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          property_id: r.property_id,
          property_address: prop?.address ?? null,
          property_city: prop?.city ?? null,
          property_owner: prop?.property_owner ?? null,
          monthly_amount: monthly,
          payment_day_of_month: payDay,
          payment_type: r.payment_type ?? null,
          days_overdue: daysOverdue,
        };
      })
      .filter((r) => r.days_overdue > 0);
  },

  getExpiringRenters: async (params?: { days_until?: number }) => {
    const horizon = params?.days_until ?? 90;
    const today = new Date();
    const results = [];
    for (const r of mockRenters) {
      const endDate = getLeaseEndDate(r);
      if (!endDate) continue;
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
      if (daysLeft < 0 || daysLeft > horizon) continue;
      const prop = mockProperties.find((p) => p.id === r.property_id);
      results.push({
        renter_id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        property_id: r.property_id,
        property_address: prop?.address ?? null,
        property_city: prop?.city ?? null,
        property_owner: prop?.property_owner ?? null,
        lease_end_date: endDate.toISOString().slice(0, 10),
        days_until_expiry: daysLeft,
      });
    }
    return results;
  },
};

// ── notifications (feed + preferences) ──────────────────────────────────────
// A lightweight in-memory stand-in so mock/E2E mode exercises the same UI. The
// feed is derived from the mock overdue/expiring computations; read/dismissed
// state and rules live in module-scoped state for the session.

type MockEvent = 'overdue' | 'lease_expiring' | 'cpi_rent_change';

interface MockRule {
  id: number;
  event_type: MockEvent;
  label: string | null;
  enabled: boolean;
  offsets: number[];
  scope_property_ids: number[];
  scope_property_owners: string[];
  scope_renter_ids: number[];
}

const mockNotifSettings = {
  master_enabled: true,
  muted_events: [] as MockEvent[],
  cpi_min_change_amount: 10,
  cpi_min_change_percent: 0.5,
};
let mockNotifRules: MockRule[] = [];
let nextRuleId = 1;
const notifRead = new Set<number>();
const notifDismissed = new Set<number>();

async function buildMockFeed() {
  const items = [];
  const muted = new Set(mockNotifSettings.muted_events);
  if (mockNotifSettings.master_enabled && !muted.has('overdue')) {
    for (const r of await mockHomeApi.getOverdueRenters()) {
      items.push({
        id: r.renter_id * 10, // stable synthetic id (offset 0)
        type: 'overdue' as MockEvent,
        renter_id: r.renter_id,
        first_name: r.first_name,
        last_name: r.last_name,
        property_id: r.property_id,
        property_address: r.property_address,
        payment_type: r.payment_type ?? null,
        offset: 0,
        data: { days_overdue: r.days_overdue, amount: r.monthly_amount, offset: 0 },
        read: false,
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
  }
  if (mockNotifSettings.master_enabled && !muted.has('lease_expiring')) {
    for (const r of await mockHomeApi.getExpiringRenters({ days_until: 90 })) {
      items.push({
        id: r.renter_id * 10 + 1, // stable synthetic id (offset 90)
        type: 'lease_expiring' as MockEvent,
        renter_id: r.renter_id,
        first_name: r.first_name,
        last_name: r.last_name,
        property_id: r.property_id,
        property_address: r.property_address,
        payment_type: null,
        offset: 90,
        data: { days_until_expiry: r.days_until_expiry, offset: 90 },
        read: false,
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
  }
  if (mockNotifSettings.master_enabled && !muted.has('cpi_rent_change')) {
    // No index feed in mock mode, so this is a fixed sample rather than a computation —
    // enough to exercise the feed row, the collapse and the settings section.
    const effective = new Date();
    effective.setMonth(effective.getMonth() - 1, 1);
    const iso = effective.toISOString().slice(0, 10);
    for (const r of await mockHomeApi.getExpiringRenters({ days_until: 3650 })) {
      items.push({
        id: r.renter_id * 10 + 2, // stable synthetic id (offset 0)
        type: 'cpi_rent_change' as MockEvent,
        renter_id: r.renter_id,
        first_name: r.first_name,
        last_name: r.last_name,
        property_id: r.property_id,
        property_address: r.property_address,
        payment_type: null,
        offset: 0,
        data: {
          stage: 'changed' as const,
          old_amount: 5000,
          new_amount: 5240,
          delta: 240,
          delta_percent: 4.8,
          effective_date: iso,
          year_index: 1,
          base_index: 100,
          known_index: 104.8,
          index_month: iso.slice(0, 7),
          index_source: 'cbs',
          offset: 0,
        },
        read: false,
        dismissed: false,
        created_at: new Date().toISOString(),
      });
      break; // one sample is enough; a per-renter loop would swamp the mock feed
    }
  }
  return items
    .filter((i) => !notifDismissed.has(i.id))
    .map((i) => ({ ...i, read: notifRead.has(i.id) }));
}

export const mockNotificationsApi = {
  getNotifications: async (status: 'unread' | 'all' = 'all') => {
    const feed = await buildMockFeed();
    return status === 'unread' ? feed.filter((i) => !i.read) : feed;
  },
  markRead: async (id: number) => { notifRead.add(id); },
  markAllRead: async () => {
    for (const i of await buildMockFeed()) notifRead.add(i.id);
  },
  dismiss: async (id: number) => { notifDismissed.add(id); },
};

export const mockPreferencesApi = {
  getPreferences: async () => ({
    settings: { ...mockNotifSettings, muted_events: [...mockNotifSettings.muted_events] },
    rules: mockNotifRules.map((r) => ({ ...r })),
  }),
  updateSettings: async (patch: Partial<typeof mockNotifSettings>) => {
    Object.assign(mockNotifSettings, patch);
    return { ...mockNotifSettings, muted_events: [...mockNotifSettings.muted_events] };
  },
  createRule: async (draft: Partial<MockRule> & { event_type: MockEvent }) => {
    const rule: MockRule = {
      id: nextRuleId++,
      event_type: draft.event_type,
      label: draft.label ?? null,
      enabled: draft.enabled ?? true,
      offsets: draft.offsets ?? [],
      scope_property_ids: draft.scope_property_ids ?? [],
      scope_property_owners: draft.scope_property_owners ?? [],
      scope_renter_ids: draft.scope_renter_ids ?? [],
    };
    mockNotifRules.push(rule);
    return { ...rule };
  },
  updateRule: async (id: number, patch: Partial<MockRule>) => {
    const idx = mockNotifRules.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Rule not found');
    mockNotifRules[idx] = { ...mockNotifRules[idx], ...patch };
    return { ...mockNotifRules[idx] };
  },
  deleteRule: async (id: number) => {
    mockNotifRules = mockNotifRules.filter((r) => r.id !== id);
  },
  previewRule: async (draft: { offsets: number[] }) => {
    const matched = mockRenters.filter((r) => r.property_id != null).length;
    return { matched_renters: matched, estimated_alerts: matched * (draft.offsets?.length ?? 0) };
  },
};

export const mockSuppliersApi = {
  getSuppliers: async (params?: {
    categoryId?: number;
    q?: string;
    includeInactive?: boolean;
  }): Promise<Supplier[]> => {
    let list = mockSuppliers;
    if (!params?.includeInactive) {
      list = list.filter((s) => s.is_active !== false);
    }
    if (params?.categoryId != null) {
      list = list.filter((s) => s.category_ids?.includes(params.categoryId!));
    }
    if (params?.q?.trim()) {
      const q = params.q.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.name ?? '').toLowerCase();
        const phone = (s.phone ?? '').toLowerCase();
        const email = (s.email ?? '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q);
      });
    }
    return [...list];
  },
  getSupplierById: async (id: number): Promise<Supplier> => {
    const s = mockSuppliers.find((x) => x.id === id);
    if (!s) throw new Error('Supplier not found');
    return { ...s };
  },
  createSupplier: async (data: SupplierCreate): Promise<Supplier> => {
    const newSupplier: Supplier = {
      id: nextSupplierId++,
      category_ids: data.category_ids,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      bank_account: data.bank_account ?? null,
      is_active: true,
    };
    mockSuppliers.push(newSupplier);
    return { ...newSupplier };
  },
  updateSupplier: async (id: number, data: SupplierUpdate): Promise<Supplier> => {
    const idx = mockSuppliers.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error('Supplier not found');
    mockSuppliers[idx] = {
      ...mockSuppliers[idx],
      ...data,
      category_ids: data.category_ids ?? mockSuppliers[idx].category_ids,
    };
    return { ...mockSuppliers[idx] };
  },
};

// ─── Document scan (lease extraction) ─────────────────────────────────────────
// A canned extraction so the scan flow — and the "active scan" pill — work offline / in E2E
// without the real vision backend. The delay makes the "scanning…" state (and the pill)
// observable, and honours the abort signal so cancelling the pill rejects promptly.
export const mockDocumentScanApi = {
  extractLease: async (
    _file: File,
    signal?: AbortSignal,
  ): Promise<{ logId: number; extraction: LeaseExtraction }> => {
    await new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, 2500);
      signal?.addEventListener('abort', () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
    const extraction: LeaseExtraction = {
      property: {
        address_evidence: 'הנכס ברחוב הרצל 42, תל אביב',
        address: 'Herzl 42', city: 'Tel Aviv', zip_code: '6100000', type: null,
        sq_ft: 85, number_of_rooms: 3, parking_numbers: ['12'], floor: 3, apartment: '9',
        block: null, plot: null, property_owner: 'Dana Levi',
        electricity_meter_number: null, electricity_account_number: null,
        water_meter_number: null, water_account_number: null,
        property_tax: null, house_committee: 250, inventory_notes: null,
      },
      renters: [
        {
          first_name: 'Noa', last_name: 'Cohen', phone: '050-1234567', email: 'noa@example.com',
          lease_start: '2025-08-01', lease_years: null, contract_term_years: 1, contract_term_months: 0,
          option_years: 1, option_term_months: 0,
          base_rent: null, rent_escalation_mode: 'none', rent_escalation_value: null,
          number_of_payments: 12, payment_type: null, payment_day_of_month: 1,
          insurance_type: null, insurance_amount: null, extra_contacts: null,
        },
        {
          first_name: 'Amir', last_name: 'Katz', phone: '052-7654321', email: null,
          lease_start: '2025-08-01', lease_years: null, contract_term_years: 1, contract_term_months: 0,
          option_years: 1, option_term_months: 0,
          base_rent: null, rent_escalation_mode: 'none', rent_escalation_value: null,
          number_of_payments: 12, payment_type: null, payment_day_of_month: 1,
          insurance_type: null, insurance_amount: null, extra_contacts: null,
        },
      ],
      rent_is_joint: true,
      joint_monthly_rent: 6000,
      notes: [
        { section: 'property', field: 'house_committee', renter_index: null, confidence: 'low', source_text: 'ועד בית ~250 ₪' },
      ],
    };
    return { logId: Date.now(), extraction };
  },
};

// --- Portfolio Chat Agent -----------------------------------------------------------------
// A canned streamed answer + an in-memory conversation store so the chat, its streaming UI,
// source chips, and thread history all work offline / in E2E without the real agent backend.

function _sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

const _agentConversations: ConversationSummary[] = [];
const _agentMessages: Record<number, StoredMessage[]> = {};
let _agentConvoId = 1;
let _agentMsgId = 1;

export const mockAgentApi = {
  getStatus: async (): Promise<AgentStatus> => ({ enabled: true }),

  listConversations: async (): Promise<ConversationSummary[]> =>
    [..._agentConversations].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),

  getConversation: async (id: number): Promise<ConversationDetail> => {
    const conversation = _agentConversations.find((c) => c.id === id);
    if (!conversation) throw new Error('Conversation not found');
    return { conversation, messages: _agentMessages[id] ?? [] };
  },

  deleteConversation: async (id: number): Promise<void> => {
    const i = _agentConversations.findIndex((c) => c.id === id);
    if (i !== -1) _agentConversations.splice(i, 1);
    delete _agentMessages[id];
  },

  stream: async ({ message, conversationId, signal, onEvent }: StreamChatArgs): Promise<void> => {
    const now = () => new Date().toISOString();
    let convo = conversationId != null ? _agentConversations.find((c) => c.id === conversationId) : undefined;
    if (!convo) {
      convo = { id: _agentConvoId++, title: message.slice(0, 60), created_at: now(), updated_at: now() };
      _agentConversations.push(convo);
      _agentMessages[convo.id] = [];
    }
    _agentMessages[convo.id].push({ id: _agentMsgId++, role: 'user', content: message, created_at: now() });
    onEvent({ type: 'conversation', conversation_id: convo.id });

    // Two canned answers: a table-shaped question exercises Markdown rendering (GFM table +
    // bold); anything else returns the Hebrew answer that cites a seeded renter (Sources chip
    // → /renters/1). Both are stripped of citation markers before display.
    const wantsTable = /table|properties|list all/i.test(message);
    const answer = wantsTable
      ? 'Here are your **properties**:\n\n| Property | Rent |\n| --- | --- |\n| HaPalmach 12 | ₪12,000 |\n| Herzl 5 | ₪6,500 |\n\nTwo properties in total. [[property:1|HaPalmach 12]]'
      : 'החוזה מסתיים במרץ 2027, עם שנת אופציה אחת שנותרה. [[renter:1|חוזה השוכר]]';

    await _sleep(250, signal);
    onEvent({ type: 'tool', name: wantsTable ? 'list_properties' : 'get_lease_schedule' });
    await _sleep(250, signal);
    for (const chunk of answer.match(/.{1,10}/gs) ?? [answer]) {
      await _sleep(50, signal);
      onEvent({ type: 'text', delta: chunk });
    }

    _agentMessages[convo.id].push({
      id: _agentMsgId++,
      role: 'assistant',
      content: [{ type: 'text', text: answer }],
      created_at: now(),
    });
    convo.updated_at = now();
    onEvent({ type: 'done', status: 'success', message: answer, tool_calls: ['get_lease_schedule'] });
  },
};

// --- Export all data ----------------------------------------------------------------------
// The real export is a server-built ZIP (workbook + uploaded files). Offline there is nothing
// to zip, so hand back a tiny placeholder file: enough for the Settings row and its E2E
// download assertion to exercise the same code path.

export const mockExportApi = {
  downloadAllData: async (filename: string): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    const note = 'Mock API: exports are generated by the backend, so this archive is empty.';
    const url = URL.createObjectURL(new Blob([note], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.zip$/, '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
