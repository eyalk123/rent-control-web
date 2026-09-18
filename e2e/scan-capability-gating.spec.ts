import { test, expect } from '@playwright/test';
import { mapExtraction } from '../src/features/document-scan/utils/mapExtraction';
import type { ExtractedProperty, ExtractedRenter, LeaseExtraction } from '../src/features/document-scan/types';
import { setActiveCapabilities, type Capabilities } from '../src/shared/utils/capabilities';

/**
 * A scanned lease may legitimately name something this country cannot store.
 *
 * The scanner's vocabulary is global — the prompt offers `garden_apartment`, `bit` and `cpi`
 * to every account — while the app's is per-country, because every picker narrows by
 * capability. Nothing reconciled the two, so a Spanish lease whose rent is index-linked came
 * back as `cpi`, reached a rent-change control with no such option, rendered blank, and then
 * failed `_guard_index_linkage` on submit. A dead end the user could not resolve.
 *
 * These run in Node — nothing here touches `page`, so no browser is launched — which is why
 * they live beside `onboarding-registry.spec.ts` rather than in a unit-test layer this app
 * does not otherwise have.
 */

const ISRAEL: Capabilities = {
  cpiLinkage: true,
  taxTracks: true,
  israeliPropertyTypes: true,
  bitPayments: true,
  structuredBankDetails: true,
};

const SPAIN: Capabilities = {
  cpiLinkage: false,
  taxTracks: false,
  israeliPropertyTypes: false,
  bitPayments: false,
  structuredBankDetails: false,
};

const EMPTY_PROPERTY: ExtractedProperty = {
  address_evidence: null, address: null, city: null, zip_code: null, type: null,
  sq_ft: null, number_of_rooms: null, parking_numbers: null, floor: null, apartment: null,
  block: null, plot: null, property_owner: null, electricity_meter_number: null,
  electricity_account_number: null, water_meter_number: null, water_account_number: null,
  property_tax: null, house_committee: null, inventory_notes: null,
};

const EMPTY_RENTER: ExtractedRenter = {
  first_name: null, last_name: null, phone: null, email: null, lease_start: null,
  lease_years: null, contract_term_years: null, contract_term_months: null,
  option_years: null, option_term_months: null, base_rent: null,
  rent_escalation_mode: null, rent_escalation_value: null, number_of_payments: null,
  payment_type: null, payment_day_of_month: null, insurance_type: null,
  insurance_amount: null, extra_contacts: null,
};

/** A lease naming all three Israel-only values at once. */
function israeliFlavouredLease(): LeaseExtraction {
  return {
    property: { ...EMPTY_PROPERTY, type: 'housing_unit', city: 'Madrid' },
    renters: [{ ...EMPTY_RENTER, rent_escalation_mode: 'cpi', payment_type: 'bit' }],
    rent_is_joint: false,
    joint_monthly_rent: null,
    notes: [],
  };
}

// The module default is Israel's full set, and every other spec in this file tree relies on
// that. Put it back so test order can never matter.
test.afterEach(() => setActiveCapabilities(ISRAEL));

test.describe('scan mapping, capability-gated values', () => {
  test('a value this country cannot store is kept out of the prefill', () => {
    setActiveCapabilities(SPAIN);
    const mapped = mapExtraction(israeliFlavouredLease());

    expect(mapped.propertyPrefill.type).toBeUndefined();
    expect(mapped.renters[0].prefill.escalationMode).toBeUndefined();
    expect(mapped.renters[0].prefill.paymentType).toBeUndefined();
  });

  test('...and the user is told what the lease said instead of it vanishing', () => {
    setActiveCapabilities(SPAIN);
    const mapped = mapExtraction(israeliFlavouredLease());

    // The distinction that matters: the model was not unsure, so this is not an uncertainty
    // note. It read the document correctly and the app has nowhere to put the answer, which
    // only the user can resolve. Same treatment as an unsupported payment cadence.
    expect(mapped.propertyReview).toContainEqual(
      expect.objectContaining({ formKey: 'type', value: 'housing_unit' }),
    );
    expect(mapped.renters[0].review).toContainEqual(
      expect.objectContaining({ formKey: 'escalationMode', value: 'cpi' }),
    );
    expect(mapped.renters[0].review).toContainEqual(
      expect.objectContaining({ formKey: 'paymentType', value: 'bit' }),
    );
  });

  test('the same lease is untouched in Israel', () => {
    setActiveCapabilities(ISRAEL);
    const mapped = mapExtraction(israeliFlavouredLease());

    expect(mapped.propertyPrefill.type).toBe('housing_unit');
    expect(mapped.renters[0].prefill.escalationMode).toBe('cpi');
    expect(mapped.renters[0].prefill.paymentType).toBe('bit');
    // Nothing to resolve, so nothing is raised: an Israeli scan is what it always was.
    expect(mapped.propertyReview).toEqual([]);
    expect(mapped.renters[0].review).toEqual([]);
  });

  test('a value the country does have is left alone', () => {
    setActiveCapabilities(SPAIN);
    const mapped = mapExtraction({
      property: { ...EMPTY_PROPERTY, type: 'apartment' },
      renters: [{ ...EMPTY_RENTER, rent_escalation_mode: 'percent', payment_type: 'check' }],
      rent_is_joint: false,
      joint_monthly_rent: null,
      notes: [],
    });

    expect(mapped.propertyPrefill.type).toBe('apartment');
    expect(mapped.renters[0].prefill.escalationMode).toBe('percent');
    expect(mapped.renters[0].prefill.paymentType).toBe('check');
    expect(mapped.propertyReview).toEqual([]);
    expect(mapped.renters[0].review).toEqual([]);
  });
});
