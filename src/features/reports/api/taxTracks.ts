import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockTaxTracksApi } from '@/core/api/mock';

/**
 * The tax tracks report (PLATFORM.md §12). Computed on the server, which holds the Tax
 * Authority's figures for each year; this client only lays it out. Israel only, behind
 * `capabilities().taxTracks`.
 */

export interface TaxFigure {
  /** A number, or for the bracket tables `[[upper, ratePct], ..., [null, topPct]]`. */
  value: number | [number | null, number][];
  /** `document` — read from the year's Tax Authority booklet; `law` — a rate in the law. */
  source: 'document' | 'law';
  reference: string | null;
  url: string;
}

export interface TaxPropertyBrief {
  id: number;
  address: string;
  city: string;
}

export interface TaxCheck {
  renter_id: number;
  renter_name: string;
  property_id: number;
  month: number;
  kind: 'missing' | 'above_lease';
  expected: number;
  recorded: number;
}

/** What a track still needs before it can be computed. The per-flat ones carry the flat. */
export type TaxMissing =
  | { code: 'tax_figures' | 'other_income' | 'mixed_ages' }
  | ({ code: 'purchase_price' | 'purchase_date' | 'interest' | 'cpi' } & TaxPropertyBrief);

/** The tax on rent that is taxed at the marginal rate, once everything it needs is known. */
interface TaxAssessed {
  taxable_income?: number;
  income_tax?: number;
  surtax?: number;
  capital_surtax?: number;
}

export interface TaxExemption extends TaxAssessed {
  available: boolean;
  ceiling: number | null;
  missing: TaxMissing[];
  /** Properties with a company renter, which rule the exemption out for the group. */
  company_renter: TaxPropertyBrief[];
  months?: { month: number; rent: number; taxable: number }[];
  exempt?: number;
  taxable?: number;
  /** The taxable part's share of the expenses. */
  exemption_deductions?: number;
  /** 0 when fully exempt; null until the taxable part's tax can be worked out. */
  tax?: number | null;
}

export interface TaxTenPercent {
  available: boolean;
  rate_pct: number | null;
  gross: number;
  /** The rate on the gross — known at once. */
  base_tax: number | null;
  surtax?: number;
  capital_surtax?: number;
  /** With the surtax, which needs the other income. */
  tax: number | null;
  missing: TaxMissing[];
}

export interface TaxDepreciation extends TaxPropertyBrief {
  months: number;
  rate_pct: number | null;
  amount: number | null;
  price?: number;
  purchase_year?: number;
  factor?: number;
  value?: number;
  /** Bought before the index series starts: no linked value, so no depreciation. */
  before_cpi?: boolean;
  /** `[year, month]` readings used; `estimated` when the year's last one is not out yet. */
  cpi?: { from: [number, number]; start: [number, number]; end: [number, number]; estimated: boolean } | null;
}

export interface TaxMarginal extends TaxAssessed {
  available: boolean;
  missing: TaxMissing[];
  rent: number;
  expenses: number;
  depreciation: TaxDepreciation[];
  depreciation_total?: number;
  income?: number;
  /** Expenses and depreciation came to more than the rent. */
  loss?: boolean;
  tax?: number;
  /** The current year: the expenses are those recorded so far. */
  expenses_so_far: boolean;
}

export type TaxTrack = 'exemption' | 'ten_percent' | 'marginal';

export type TaxCombination =
  | { available: false; reason: 'one_flat' | 'missing' | 'too_many' | null }
  | ({
      available: true;
      flats: (TaxPropertyBrief & { track: TaxTrack })[];
      /** More than one track among the flats. */
      mixed: boolean;
      ten_percent_tax: number;
      tax: number;
    } & TaxAssessed);

export interface TaxExpenses {
  counted: { key: string; amount: number }[];
  /** `label` is a built-in category's key, or the name of the account's own one. */
  not_counted: { label: string | null; built_in: boolean; amount: number }[];
  renovation: number;
  recognised: string[];
}

export interface TaxInputs {
  other_income: number | null;
  credit_points: number | null;
  /** Other income is under the income that uses up a resident's basic points. */
  credit_points_asked: boolean;
  credit_points_used: number | null;
  credit_points_threshold: number | null;
}

export type TaxNote =
  | { code: 'maybe_business'; count: number; threshold: number }
  | { code: 'likely_business'; count: number; threshold: number }
  | { code: 'rent_paid_deduction'; cap: number }
  | { code: 'over_60_ticked_later'; name: string; year: number }
  | { code: 'no_owner_age' };

export interface TaxReportGroup {
  key: string;
  kind: 'owner' | 'custom' | 'none';
  /** Owner or group name; null for the properties with no owner. */
  name: string | null;
  group_id: number | null;
  property_owner_ids: number[];
  member_property_ids: number[];
  properties: (TaxPropertyBrief & { rent: number })[];
  commercial: TaxPropertyBrief[];
  rent_by_month: number[];
  forecast_months: number[];
  total_rent: number;
  checks: TaxCheck[];
  exemption: TaxExemption;
  ten_percent: TaxTenPercent;
  marginal: TaxMarginal;
  combination: TaxCombination;
  expenses: TaxExpenses;
  inputs: TaxInputs;
  /** Taxed on the brackets from 10% (60 or over in the year); null when the owners differ. */
  senior: boolean | null;
  notes: TaxNote[];
}

export type TaxFigureKey =
  | 'rent_exemption_ceiling_monthly'
  | 'ten_percent_rate_pct'
  | 'personal_brackets'
  | 'other_income_brackets'
  | 'senior_age'
  | 'credit_point_monthly'
  | 'resident_credit_points'
  | 'surtax_threshold'
  | 'surtax_rate_pct'
  | 'capital_surtax_rate_pct'
  | 'depreciation_rate_pct'
  | 'rent_paid_deduction_cap'
  | 'passive_max_apartments'
  | 'business_min_apartments';

export interface TaxReport {
  year: number;
  country: string;
  years: number[];
  is_forecast: boolean;
  forecast_from_month: number | null;
  figures: Partial<Record<TaxFigureKey, TaxFigure>>;
  document: { url: string; fetched_at: string } | null;
  company_owners: string[];
  locked_properties: number;
  groups: TaxReportGroup[];
}

export interface TaxGroup {
  id: number;
  name: string;
  property_owner_ids: number[];
  property_ids: number[];
}

export type TaxGroupWrite = Omit<TaxGroup, 'id'>;

export interface TaxInputsWrite {
  group_key: string;
  year: number;
  other_income: number | null;
  credit_points: number | null;
}

export async function getTaxReport(year: number): Promise<TaxReport> {
  if (USE_MOCK_API) return mockTaxTracksApi.getReport(year);
  const response = await apiClient.get<TaxReport>('/tax-tracks/report', { params: { year } });
  return response.data;
}

export async function createTaxGroup(data: TaxGroupWrite): Promise<TaxGroup> {
  if (USE_MOCK_API) return mockTaxTracksApi.saveGroup(data);
  const response = await apiClient.post<TaxGroup>('/tax-tracks/groups', data);
  return response.data;
}

export async function updateTaxGroup(id: number, data: TaxGroupWrite): Promise<TaxGroup> {
  if (USE_MOCK_API) return mockTaxTracksApi.saveGroup(data, id);
  const response = await apiClient.put<TaxGroup>(`/tax-tracks/groups/${id}`, data);
  return response.data;
}

export async function deleteTaxGroup(id: number): Promise<void> {
  if (USE_MOCK_API) return mockTaxTracksApi.deleteGroup(id);
  await apiClient.delete(`/tax-tracks/groups/${id}`);
}

/** The group's other income and credit points for one year. */
export async function saveTaxInputs(data: TaxInputsWrite): Promise<TaxInputsWrite> {
  if (USE_MOCK_API) return mockTaxTracksApi.saveInputs(data);
  const response = await apiClient.put<TaxInputsWrite>('/tax-tracks/inputs', data);
  return response.data;
}
