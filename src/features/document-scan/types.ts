// Mirror of the backend app/schemas/document_extraction.py response shape (flat values
// + a `notes` list for fields the model was unsure about).
import type { PropertyType } from '@/shared/types';

export type Confidence = 'medium' | 'low';

export interface LeaseYearGuess {
  amount: number;
  type: 'option' | 'contract';
}

export interface ExtraContactGuess {
  name: string;
  phone: string;
}

export interface ExtractedProperty {
  address: string | null;
  city: string | null;
  zip_code: string | null;
  type: PropertyType | null;
  sq_ft: number | null;
  number_of_rooms: number | null;
  parking_numbers: string[] | null;
  floor: number | null;
  apartment: string | null;
  block: string | null;
  plot: string | null;
  property_owner: string | null;
  electricity_meter_number: string | null;
  electricity_account_number: string | null;
  water_meter_number: string | null;
  water_account_number: string | null;
  property_tax: number | null;
  house_committee: number | null;
  inventory_notes: string | null;
}

export interface ExtractedRenter {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  lease_start: string | null;
  lease_years: LeaseYearGuess[] | null;
  contract_term_years: number | null;
  option_years: number | null;
  base_rent: number | null;
  rent_escalation_mode: 'none' | 'percent' | 'fixed' | 'custom' | null;
  rent_escalation_value: number | null;
  number_of_payments: number | null;
  payment_type: string | null;
  payment_day_of_month: number | null;
  insurance_type: string | null;
  insurance_amount: number | null;
  extra_contacts: ExtraContactGuess[] | null;
}

/** Uncertainty note for one field (snake name within its section). */
export interface FieldNote {
  section: 'property' | 'renter';
  field: string;
  confidence: Confidence;
  source_text: string | null;
}

export interface LeaseExtraction {
  property: ExtractedProperty;
  renter: ExtractedRenter;
  notes: FieldNote[];
}

/** One uncertain field shown in the review banner and flagged inline on the form: its label,
 *  the RHF field name (to match/jump to the control), the value we pre-filled, the model's
 *  confidence, and the source snippet it came from. */
export interface ReviewItem {
  field: string; // i18n label key
  formKey: string; // RHF field name — matches FieldReviewProvider / banner jump target
  value: string;
  source: string | null;
  confidence?: Confidence;
}

/** Per prefilled scalar field, what we filled — used on submit to detect what the
 *  user changed (audit log). Covers all prefilled fields, not just uncertain ones. */
export interface ProvenanceItem {
  formKey: string; // RHF field name
  labelKey: string; // i18n label key
  prefilledValue: string;
  source: string | null;
}
