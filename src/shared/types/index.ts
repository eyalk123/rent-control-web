// Property type - backend expects lowercase
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'garden_apartment' | 'housing_unit';

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
  sq_ft: number;
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
  option_years?: number | null;
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

  const yearIndex = Math.floor(monthsDiff / 12);
  return years[Math.min(yearIndex, years.length - 1)].amount;
}

/** Monthly rent for the lease year that covers today. Use for headline "current rent" display. */
export function getCurrentMonthlyRent(renter: Renter): number {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getRentForMonth(renter, monthStr);
}

/** Total monthly rent across a property's renters using each renter's current-year rent. */
export function getTotalCurrentMonthlyRent(renters: Renter[] | null | undefined): number {
  if (!renters?.length) return 0;
  return renters.reduce((sum, r) => sum + getCurrentMonthlyRent(r), 0);
}

/** Lease end date calculated from lease_start + number of contract (non-option) years. */
export function getLeaseEndDate(renter: Renter): Date | null {
  if (!renter.lease_start || !renter.lease_years?.length) return null;
  const contractYears = renter.lease_years.filter((y) => y.type === 'contract').length;
  if (contractYears === 0) return null;
  const start = new Date(renter.lease_start);
  if (isNaN(start.getTime())) return null;
  return new Date(start.getFullYear() + contractYears, start.getMonth(), start.getDate());
}

// Transactions

export type TransactionType = 'revenue' | 'expense';

export type PaymentMethod = 'bit' | 'cash' | 'bank_transfer' | 'check';

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
  sq_ft: number;
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
  sq_ft?: number;
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
