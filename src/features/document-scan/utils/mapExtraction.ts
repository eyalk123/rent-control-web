import type { PropertyFormValues } from '@/features/properties/validation/propertyValidation';
import type { RenterFormValues } from '@/features/renters/validation/renterValidation';
import type { ExtractedRenter, FieldNote, LeaseExtraction, ProvenanceItem, ReviewItem } from '../types';

/** One extracted renter, mapped to the renter form (prefill + review + provenance). */
export interface MappedRenter {
  prefill: Partial<RenterFormValues>;
  review: ReviewItem[]; // fields the model flagged uncertain (have a note)
  provenance: ProvenanceItem[]; // all prefilled scalar fields (for submit diff)
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

  const propAssigns: Assign<keyof PropertyFormValues>[] = [
    { key: 'address', i18n: 'property.address', field: 'address', get: () => s(p.address) },
    { key: 'city', i18n: 'property.city', field: 'city', get: () => s(p.city) },
    { key: 'zipCode', i18n: 'property.zipCode', field: 'zip_code', get: () => s(p.zip_code) },
    { key: 'type', i18n: 'property.type', field: 'type', get: () => p.type ?? undefined },
    { key: 'sqFt', i18n: 'property.sqFt', field: 'sq_ft', get: () => s(p.sq_ft) },
    { key: 'numberOfRooms', i18n: 'property.numberOfRooms', field: 'number_of_rooms', get: () => s(p.number_of_rooms) },
    { key: 'floor', i18n: 'property.floor', field: 'floor', get: () => s(p.floor) },
    { key: 'apartment', i18n: 'property.apartment', field: 'apartment', get: () => s(p.apartment) },
    { key: 'block', i18n: 'property.block', field: 'block', get: () => s(p.block) },
    { key: 'plot', i18n: 'property.plot', field: 'plot', get: () => s(p.plot) },
    { key: 'propertyOwner', i18n: 'property.owner', field: 'property_owner', get: () => s(p.property_owner) },
    { key: 'inventoryNotes', i18n: 'property.inventoryNotes', field: 'inventory_notes', get: () => s(p.inventory_notes) },
    { key: 'electricityMeterNumber', i18n: 'property.electricityMeterNumber', field: 'electricity_meter_number', get: () => s(p.electricity_meter_number) },
    { key: 'electricityAccountNumber', i18n: 'property.electricityAccountNumber', field: 'electricity_account_number', get: () => s(p.electricity_account_number) },
    { key: 'waterMeterNumber', i18n: 'property.waterMeterNumber', field: 'water_meter_number', get: () => s(p.water_meter_number) },
    { key: 'waterAccountNumber', i18n: 'property.waterAccountNumber', field: 'water_account_number', get: () => s(p.water_account_number) },
    { key: 'propertyTax', i18n: 'property.propertyTax', field: 'property_tax', get: () => s(p.property_tax) },
    { key: 'houseCommittee', i18n: 'property.houseCommittee', field: 'house_committee', get: () => s(p.house_committee) },
    { key: 'parkingNumbersStr', i18n: 'property.parkingNumbers', field: 'parking_numbers', get: () => (p.parking_numbers && p.parking_numbers.length ? p.parking_numbers.join(', ') : undefined) },
  ];

  const propertyPrefill: Partial<PropertyFormValues> = {};
  const propertyReview: ReviewItem[] = [];
  const propertyProvenance: ProvenanceItem[] = [];
  for (const a of propAssigns) {
    const v = a.get();
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
    { key: 'optionYears', i18n: 'renter.optionYears', field: 'option_years', get: () => s(r.option_years) },
    { key: 'baseRent', i18n: 'renter.baseRent', field: 'base_rent', get: () => s(r.base_rent) },
    { key: 'escalationValue', i18n: 'renter.escalationValue', field: 'rent_escalation_value', get: () => s(r.rent_escalation_value) },
    { key: 'escalationMode', i18n: 'renter.escalationMode', field: 'rent_escalation_mode', get: () => r.rent_escalation_mode ?? undefined },
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
