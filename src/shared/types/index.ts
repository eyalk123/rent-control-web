// Property type - backend expects lowercase
// Every value the column can hold, everywhere. `garden_apartment` and `housing_unit` are
// Israeli categories and `bit` is an Israeli payment app — they stay in the unions because
// an existing record can hold them and must keep rendering. Which of them a user may
// *pick* is narrowed by capability, not here.
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'commercial'
  | 'garden_apartment'
  | 'housing_unit'
  | 'condo_townhouse'
  | 'room'
  | 'other';

// Brief property shape (for nested in renter responses)
export interface PropertyBrief {
  id: number;
  address: string;
  city: string;
  type: PropertyType;
  floor?: number | null;
  apartment?: string | null;
}

// Property - matches backend
export interface Property {
  id: number;
  owner_id: number;
  address: string;
  city: string;
  zip_code: string;
  type: PropertyType;
  /** Square **metres**, despite the name — the column predates the unit work. */
  sq_ft: number | null;
  image_url: string | null;
  number_of_rooms?: number | null;
  parking_numbers?: string[] | null;
  electricity_meter_number?: string | null;
  electricity_account_number?: string | null;
  water_meter_number?: string | null;
  water_account_number?: string | null;
  property_tax?: number | null;
  house_committee?: number | null;
  property_owner?: string | null;
  inventory_notes?: string | null;
  basic_contract_url?: string | null;
  land_registry_url?: string | null;
  floor?: number | null;
  apartment?: string | null;
  block?: string | null;
  plot?: string | null;
  renters: Renter[] | null;
  /** Enriched on list when renters are fetched; used for occupancy display */
  hasRenters?: boolean;
}

export interface ExtraContact {
  name: string;
  phone: string;
}

// Lease: per-year amount and type (option vs contract) - matches FormLeaseYearsField UI
export type LeaseYearType = 'option' | 'contract';

/**
 * How one lease year's rent derives from the *previous* year's amount. Only meaningful
 * under the `custom` escalation mode, where each year carries its own rule instead of the
 * whole lease sharing one.
 *
 * `manual` means the owner typed the amount and it is never derived — which is also what an
 * absent rule means, and therefore what every year stored before this feature existed means.
 */
export type LeaseYearRuleMode = 'manual' | 'none' | 'percent' | 'fixed' | 'cpi';

export interface LeaseYearRule {
  mode: LeaseYearRuleMode;
  /** Required for `percent` and `fixed`; unused by the others. */
  value?: number;
}

export interface LeaseYear {
  amount: number;
  type: LeaseYearType;
  /** Absent on year one (it is the base rent) and on every year of a non-custom lease. */
  rule?: LeaseYearRule;
  /**
   * How long this period runs. **Absent means 12** — which is why no stored lease needed
   * migrating when periods stopped being whole years. Only the last period of the
   * contract block and of the option block is ever short; a partial period mid-lease is
   * not a thing that happens, and the form cannot express one.
   */
  months?: number;
  /**
   * Written by the server's lease generator, never by a form: this period is part of the
   * rolling horizon an open-ended lease carries, not a term anyone agreed to. The clients
   * label it as automatic rather than as Contract or Option, and it is also what a later
   * job would read to tell its own rows from ones the owner has corrected by hand.
   */
  generated?: boolean;
}

/** How the monthly rent changes from one lease year to the next. */
export type RentEscalationMode = 'none' | 'percent' | 'fixed' | 'custom' | 'cpi';

/**
 * Structured lease-term intent. `lease_years` remains the source of truth for all
 * rent math; these optional fields let the renter form round-trip the higher-level
 * intent (term length, renewal options, escalation rule) so an edit re-opens with
 * the same controls the user originally chose.
 */
export interface LeaseTermIntent {
  contract_term_years?: number | null;
  /** Odd months on top of the whole contract years, 0-11. Absent reads as 0. */
  contract_term_months?: number | null;
  option_years?: number | null;
  option_term_months?: number | null;
  base_rent?: number | null;
  rent_escalation_mode?: RentEscalationMode | null;
  rent_escalation_value?: number | null;
}

// Renter - matches backend
export interface Renter extends LeaseTermIntent {
  id: number;
  property_id: number | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  lease_years: LeaseYear[];
  lease_start: string | null;
  /** CPI base index frozen at signing (mode === 'cpi'). Server-set, read-only. */
  cpi_base_index?: number | null;
  /**
   * Set when the lease was ended early. Read-only here — it moves only through the
   * terminate endpoints, never through a renter save, so an edit can't close a lease by
   * accident. `lease_years` and `cpi_base_index` are untouched by it: the signed terms
   * stay on the record so past reports still reconstruct.
   */
  /** "Don't warn me when this lease expires" — see the renter form. */
  suppress_expiry_alerts?: boolean;
  /**
   * A tenancy with no agreed end. It does **not** mean the lease has no end date: a nightly
   * job keeps a rolling five-year window of periods on it, so everything that reads a lease
   * end still reads a real one — it just moves. The generated periods carry `generated: true`.
   *
   * Per lease, not per country: an Israeli month-to-month holdover is open-ended too. Implies
   * `suppress_expiry_alerts`, because the countdown would be to a date that keeps moving.
   */
  open_ended?: boolean;
  terminated_on?: string | null;
  termination_reason?: string | null;
  number_of_payments?: number | null;
  payment_type?: string | null;
  payment_day_of_month?: number | null;
  insurance_type?: string | null;
  insurance_amount?: number | null;
  property: PropertyBrief | null;
  /** Device-specific system contact ID; used to fetch avatar from contacts. */
  contact_id?: string | null;
  extra_contacts?: ExtraContact[] | null;
  full_contract_url?: string | null;
  id_image_url?: string | null;
}

/**
 * How long one lease period runs. Absent, zero or nonsensical all read as a full year:
 * every lease stored before variable periods existed has no `months` at all, and a zero
 * would stall the cumulative walk rather than degrade to the old behaviour.
 */
export function periodMonths(year: LeaseYear): number {
  const m = year.months;
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? Math.floor(m) : 12;
}

/**
 * `date` plus `months`, clamping the day rather than rolling into the next month —
 * JS `setMonth` turns 31 Jan + 1 month into 3 March, which would move a lease's end date.
 */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/**
 * Returns the rent amount for the lease year that covers the given month.
 * monthStr is "YYYY-MM". Falls back to the first year if out of range.
 */
export function getRentForMonth(renter: Renter, monthStr: string): number {
  const years = renter.lease_years;
  if (!years?.length) return 0;
  if (!renter.lease_start) return years[0].amount;

  const leaseStart = new Date(renter.lease_start);
  if (isNaN(leaseStart.getTime())) return years[0].amount;

  const [y, m] = monthStr.split('-').map(Number);
  const monthDate = new Date(y, m - 1, 1);

  const monthsDiff =
    (monthDate.getFullYear() - leaseStart.getFullYear()) * 12 +
    (monthDate.getMonth() - leaseStart.getMonth());

  if (monthsDiff < 0) return years[0].amount;

  // Walk the periods' own lengths rather than dividing by 12 — a lease can carry a
  // short final period, after which every later period starts a month earlier than the
  // anniversary arithmetic would say.
  let cursor = 0;
  for (const year of years) {
    cursor += periodMonths(year);
    if (monthsDiff < cursor) return year.amount;
  }
  return years[years.length - 1].amount;
}

/**
 * Monthly rent for the lease year that covers today. Use for headline "current rent"
 * display.
 *
 * Says nothing about whether the lease is still running: past its end the schedule has
 * no further amount, so this reports the final period's rent — which is what a *past*
 * tenancy's row should show, and is exactly why it must not be summed blind. For any
 * "what does this property earn now" total use `getTotalCurrentMonthlyRent` in
 * `@/shared/utils/renterStatus`, which drops ended tenancies first.
 */
export function getCurrentMonthlyRent(renter: Renter): number {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getRentForMonth(renter, monthStr);
}

/**
 * i18n key naming a lease's payment cadence, with the count for the case that has no name.
 *
 * The product offers monthly, quarterly and yearly only. A stored value outside those three
 * is *not* quietly rounded into one of them — it is named for what it is ("6 per year"), so a
 * lease that arrived from scanning with an unsupported cadence stays visible instead of
 * rendering as a blank the user cannot account for.
 *
 * Null when nothing is stored. An unset cadence is treated as monthly by every calculation,
 * but printing "Monthly" on a lease that never said so would be inventing a term.
 */
export function paymentFrequencyLabel(
  numberOfPayments: number | null | undefined,
): { key: string; count: number } | null {
  const n = numberOfPayments;
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n === 12) return { key: 'renter.frequencyMonthly', count: n };
  if (n === 4) return { key: 'renter.frequencyQuarterly', count: n };
  if (n === 1) return { key: 'renter.frequencyYearly', count: n };
  return { key: 'renter.frequencyOther', count: n };
}

/** True when the lease is paid on a cycle longer than a month — quarterly, yearly, anything. */
export function isNonMonthlyCadence(numberOfPayments: number | null | undefined): boolean {
  return numberOfPayments != null && numberOfPayments > 0 && numberOfPayments < 12;
}

/**
 * End of the *binding* term — lease_start plus every contract period's length.
 *
 * Deliberately not the end of the whole schedule: an option period is not yet exercised,
 * so this is the date the landlord actually has to decide something. The server stores
 * the same date as `contract_end` and fires the lease-expiring alert from it.
 */
export function getLeaseEndDate(renter: Renter): Date | null {
  if (!renter.lease_start || !renter.lease_years?.length) return null;
  const start = new Date(renter.lease_start);
  if (isNaN(start.getTime())) return null;

  let months = 0;
  let contractMonths = 0;
  for (const year of renter.lease_years) {
    months += periodMonths(year);
    if (year.type !== 'option') contractMonths = months;
  }
  if (contractMonths === 0) return null;
  return addMonths(start, contractMonths);
}

/** End of the whole signed schedule, options included. */
export function getScheduleEndDate(renter: Renter): Date | null {
  if (!renter.lease_start || !renter.lease_years?.length) return null;
  const start = new Date(renter.lease_start);
  if (isNaN(start.getTime())) return null;
  return addMonths(
    start,
    renter.lease_years.reduce((sum, y) => sum + periodMonths(y), 0),
  );
}

// Transactions

export type TransactionType = 'revenue' | 'expense';

export type PaymentMethod =
  | 'bit'
  | 'cash'
  | 'bank_transfer'
  | 'check'
  | 'card'
  | 'mobile_payment'
  | 'other';

export interface Transaction {
  id: number;
  type: TransactionType;
  property_id: number;
  renter_id: number | null;
  payment_method: PaymentMethod | null;
  date_of_payment: string;
  /** Month the transaction is for (YYYY-MM format or full date string), revenues only */
  month_for: string | null;
  amount: number;
  /**
   * What the lease schedule said was owed for `month_for`, frozen by the server when the
   * payment was recorded. Revenues only; null on rows recorded before it existed.
   *
   * The schedule itself is mutable and keeps no history — raising a renter's base rent
   * re-derives every lease year, elapsed ones included — so comparing a payment against
   * the *live* schedule reports a correctly-paid month as short. This is the figure that
   * was actually being charged at the time, which is what a mismatch should be measured
   * against. See `hasAmountMismatch` in `features/transactions/utils/rentSchedule.ts`.
   */
  expected_amount: number | null;
  currency_code: string;
  category_id: number | null;
  category_ids?: number[];
  supplier_id: number | null;
  notes: string | null;
  receipt_image_url?: string | null;
  // Denormalized display fields
  property_name: string;
  renter_name: string | null;
  category_name: string | null;
  supplier_name: string | null;
}

export interface TransactionCreateRevenue {
  property_id: number;
  renter_id?: number | null;
  amount: number;
  date_of_payment: string;
  /** Month the rent was paid for (e.g. 2026-02-01, day ignored) */
  month_for: string;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface TransactionCreateExpense {
  property_id: number;
  renter_id?: number | null;
  amount: number;
  date_of_payment: string;
  payment_method: PaymentMethod;
  category_ids: number[];
  supplier_id?: number | null;
  notes?: string;
  receipt_image_url?: string | null;
}

export interface ExpenseCategory {
  id: number;
  /** Predefined categories only */
  key?: string;
  /** User-created categories only */
  name?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ExpenseCategoryCreate {
  name: string;
}

export interface Supplier {
  id: number;
  category_ids: number[];
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  bank_account?: string | null;
  is_active: boolean;
}

export interface SupplierCreate {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  bank_account?: string | null;
  category_ids: number[];
}

export interface SupplierUpdate {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  bank_account?: string | null;
  category_ids?: number[];
  is_active?: boolean;
}

export interface PropertyRenterSummary {
  /** True when this tenancy has finished. Only populated when the list was fetched
   * with `includeEnded` — the picker uses it to mark the option. */
  is_ended?: boolean;
  id: number;
  first_name: string;
  last_name: string;
  /** Display monthly rent (e.g. derived from first lease year). */
  monthly_rent: number;
  lease_start: string | null;
  lease_years: LeaseYear[];
}

// Create payload (what frontend sends on POST /properties)
export interface PropertyCreate {
  address: string;
  city: string;
  zip_code: string;
  type: PropertyType;
  /** Square metres. Optional since the API stopped requiring it. */
  sq_ft?: number | null;
  image_url?: string | null;
  number_of_rooms?: number | null;
  parking_numbers?: string[] | null;
  electricity_meter_number?: string | null;
  electricity_account_number?: string | null;
  water_meter_number?: string | null;
  water_account_number?: string | null;
  property_tax?: number | null;
  house_committee?: number | null;
  property_owner?: string | null;
  inventory_notes?: string | null;
  basic_contract_url?: string | null;
  land_registry_url?: string | null;
  floor?: number | null;
  apartment?: string | null;
  block?: string | null;
  plot?: string | null;
}

// Update payload (PATCH /properties/{id}) - all fields optional
export interface PropertyUpdate {
  address?: string;
  city?: string;
  zip_code?: string;
  type?: PropertyType;
  sq_ft?: number | null;
  image_url?: string | null;
  number_of_rooms?: number | null;
  parking_numbers?: string[] | null;
  electricity_meter_number?: string | null;
  electricity_account_number?: string | null;
  water_meter_number?: string | null;
  water_account_number?: string | null;
  property_tax?: number | null;
  house_committee?: number | null;
  property_owner?: string | null;
  inventory_notes?: string | null;
  basic_contract_url?: string | null;
  land_registry_url?: string | null;
  floor?: number | null;
  apartment?: string | null;
  block?: string | null;
  plot?: string | null;
}

// Create payload (POST /renters)
export interface RenterCreate extends LeaseTermIntent {
  /** "Don't warn me when this lease expires" — see the renter form. */
  suppress_expiry_alerts?: boolean;
  /** A tenancy with no agreed end; the server keeps a rolling window of periods on it. */
  open_ended?: boolean;
  property_id?: number | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  lease_years: LeaseYear[];
  lease_start?: string | null;
  number_of_payments?: number | null;
  payment_type?: string | null;
  payment_day_of_month?: number | null;
  insurance_type?: string | null;
  insurance_amount?: number | null;
  contact_id?: string | null;
  extra_contacts?: ExtraContact[] | null;
  full_contract_url?: string | null;
  id_image_url?: string | null;
}

// Update payload (PATCH /renters/{id}) - all fields optional
export interface RenterUpdate extends LeaseTermIntent {
  /** "Don't warn me when this lease expires" — see the renter form. */
  suppress_expiry_alerts?: boolean;
  /** A tenancy with no agreed end; the server keeps a rolling window of periods on it. */
  open_ended?: boolean;
  property_id?: number | null;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  lease_years?: LeaseYear[];
  lease_start?: string | null;
  number_of_payments?: number | null;
  payment_type?: string | null;
  payment_day_of_month?: number | null;
  insurance_type?: string | null;
  insurance_amount?: number | null;
  contact_id?: string | null;
  extra_contacts?: ExtraContact[] | null;
  full_contract_url?: string | null;
  id_image_url?: string | null;
}

// API response wrapper (if backend returns { data: T })
export interface APIResponse<T> {
  data: T;
  message?: string;
}
