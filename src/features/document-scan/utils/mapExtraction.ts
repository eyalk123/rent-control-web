import type { PropertyFormValues } from '@/features/properties/validation/propertyValidation';
import type { RenterFormValues } from '@/features/renters/validation/renterValidation';
import { toPaymentMethodOrNull } from '@/shared/constants/paymentMethods';
import type { ExtractedRenter, FieldNote, LeaseExtraction, ProvenanceItem, ReviewItem } from '../types';
import { PROPERTY_SCAN_FIELDS } from './propertyFields';

/** One extracted renter, mapped to the renter form (prefill + review + provenance). */
export interface MappedRenter {
  prefill: Partial<RenterFormValues>;
  review: ReviewItem[]; // fields the model flagged uncertain (have a note)
  provenance: ProvenanceItem[]; // all prefilled scalar fields (for submit diff)
  /** Set by the scan summary when this renter matches an existing renter on the attached
   *  property. When present, the renter form edits that renter in place (prefill from stored
   *  data, fill blanks from the scan, resolve conflicts) instead of creating a duplicate. */
  existingRenterId?: number | null;
}

export interface MappedExtraction {
  propertyPrefill: Partial<PropertyFormValues>;
  propertyReview: ReviewItem[]; // fields the model flagged uncertain (have a note)
  propertyProvenance: ProvenanceItem[]; // all prefilled scalar fields (for submit diff)
  /** One entry per co-tenant on the lease. */
  renters: MappedRenter[];
  /** When true the lease has one joint rent (`jointMonthlyRent`) for all renters; the
   *  summary screen lets the user split it into each renter's `baseRent`. */
  rentIsJoint: boolean;
  jointMonthlyRent: number | null;
  /** The clause the model based the property address on — surfaced as a debug hint on the
   *  property form so we can see whether a wrong address is a mis-located or mis-read clause. */
  addressEvidence: string | null;
}

const s = (v: string | number | null | undefined): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

// Security/collateral types the renter form's insuranceType select accepts.
const INSURANCE_TYPES = new Set(['wire_transfer', 'bank_guarantee']);
const insuranceType = (v: string | null): string | undefined =>
  v && INSURANCE_TYPES.has(v) ? v : undefined;

// The backend already constrains payment_type to the PaymentMethod domain; re-map here so an
// older/unknown value (e.g. the legacy 'wire_transfer') can't reach the select as free text.
const paymentType = (v: string | null): string | undefined => toPaymentMethodOrNull(v) ?? undefined;

// `field` is the backend snake-case field name (used to look up its uncertainty note);
// `key` is the RHF form field; `i18n` the label key shown in the review banner.
type Assign<K> = { key: K; i18n: string; field: string; get: () => string | undefined };

export function mapExtraction(extraction: LeaseExtraction): MappedExtraction {
  const p = extraction.property;

  const notes = new Map<string, FieldNote>();
  for (const n of extraction.notes ?? []) {
    // Property notes key on the field; renter notes also key on the renter index so a
    // note only flags the renter it belongs to.
    const key = n.section === 'renter' ? `renter.${n.renter_index ?? 0}.${n.field}` : `property.${n.field}`;
    notes.set(key, n);
  }

  const propertyPrefill: Partial<PropertyFormValues> = {};
  const propertyReview: ReviewItem[] = [];
  const propertyProvenance: ProvenanceItem[] = [];
  for (const a of PROPERTY_SCAN_FIELDS) {
    const v = a.get(p);
    if (v === undefined) continue;
    (propertyPrefill as Record<string, unknown>)[a.key] = v;
    const note = notes.get(`property.${a.field}`);
    const source = note?.source_text ?? null;
    propertyProvenance.push({ formKey: a.key as string, labelKey: a.i18n, prefilledValue: v, source });
    if (note) propertyReview.push({ field: a.i18n, formKey: a.key as string, value: v, source, confidence: note.confidence });
  }

  const renters = (extraction.renters ?? []).map((r, i) => mapRenter(r, i, notes));

  return {
    propertyPrefill,
    propertyReview,
    propertyProvenance,
    renters,
    rentIsJoint: extraction.rent_is_joint ?? false,
    jointMonthlyRent: extraction.joint_monthly_rent ?? null,
    addressEvidence: p.address_evidence ?? null,
  };
}

/** Map one extracted renter to the renter form (prefill + review + provenance). */
function mapRenter(r: ExtractedRenter, index: number, notes: Map<string, FieldNote>): MappedRenter {
  const numberOfPayments = r.number_of_payments;
  const paymentFrequency =
    numberOfPayments === 12 ? 'monthly' : numberOfPayments === 4 ? 'quarterly' : numberOfPayments === 1 ? 'yearly' : undefined;

  const renterAssigns: Assign<keyof RenterFormValues>[] = [
    { key: 'firstName', i18n: 'renter.firstName', field: 'first_name', get: () => s(r.first_name) },
    { key: 'lastName', i18n: 'renter.lastName', field: 'last_name', get: () => s(r.last_name) },
    { key: 'phone', i18n: 'renter.phone', field: 'phone', get: () => s(r.phone) },
    { key: 'email', i18n: 'renter.email', field: 'email', get: () => s(r.email) },
    { key: 'leaseStart', i18n: 'renter.leaseStart', field: 'lease_start', get: () => s(r.lease_start) },
    { key: 'contractTermYears', i18n: 'renter.contractTermYears', field: 'contract_term_years', get: () => s(r.contract_term_years) },
    { key: 'contractTermMonths', i18n: 'renter.extraMonths', field: 'contract_term_months', get: () => s(r.contract_term_months) },
    { key: 'optionYears', i18n: 'renter.optionYears', field: 'option_years', get: () => s(r.option_years) },
    { key: 'optionTermMonths', i18n: 'renter.extraMonths', field: 'option_term_months', get: () => s(r.option_term_months) },
    { key: 'baseRent', i18n: 'renter.baseRent', field: 'base_rent', get: () => s(r.base_rent) },
    { key: 'escalationValue', i18n: 'renter.escalationValue', field: 'rent_escalation_value', get: () => s(r.rent_escalation_value) },
    { key: 'escalationMode', i18n: 'renter.escalationMode', field: 'rent_escalation_mode', get: () => r.rent_escalation_mode ?? undefined },
    { key: 'paymentType', i18n: 'renter.paymentType', field: 'payment_type', get: () => paymentType(r.payment_type) },
    { key: 'paymentDayOfMonth', i18n: 'renter.paymentDay', field: 'payment_day_of_month', get: () => s(r.payment_day_of_month) },
    { key: 'insuranceType', i18n: 'renter.insuranceType', field: 'insurance_type', get: () => insuranceType(r.insurance_type) },
    { key: 'insuranceAmount', i18n: 'renter.insuranceAmount', field: 'insurance_amount', get: () => s(r.insurance_amount) },
    { key: 'paymentFrequency', i18n: 'renter.paymentFrequency', field: 'number_of_payments', get: () => paymentFrequency },
  ];

  const prefill: Partial<RenterFormValues> = {};
  const review: ReviewItem[] = [];
  const provenance: ProvenanceItem[] = [];
  for (const a of renterAssigns) {
    const v = a.get();
    if (v === undefined) continue;
    (prefill as Record<string, unknown>)[a.key] = v;
    const note = notes.get(`renter.${index}.${a.field}`);
    const source = note?.source_text ?? null;
    provenance.push({ formKey: a.key as string, labelKey: a.i18n, prefilledValue: v, source });
    if (note) review.push({ field: a.i18n, formKey: a.key as string, value: v, source, confidence: note.confidence });
  }

  // Nested structures (not part of the scalar review/diff). Only seed the year-by-year
  // schedule for "custom" leases — otherwise the LeaseTermBuilder regenerates it from intent.
  if (r.rent_escalation_mode === 'custom' && r.lease_years && r.lease_years.length) {
    prefill.leaseYears = r.lease_years.map((ly) => ({ amount: String(ly.amount), type: ly.type }));
  }
  if (r.extra_contacts && r.extra_contacts.length) {
    prefill.extraContacts = r.extra_contacts.map((c) => ({ name: c.name, phone: c.phone }));
  }

  return { prefill, review, provenance };
}
