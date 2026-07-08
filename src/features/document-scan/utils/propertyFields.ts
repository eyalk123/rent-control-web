import type { ExtractedProperty } from '../types';

/** Shared descriptor for the scalar property fields the scanner extracts. Used both by
 *  `mapExtraction` (to build the property prefill) and by `diffProperty` (to compare a scanned
 *  lease against an existing property field-by-field). Keeping one list avoids the two going
 *  out of sync.
 *  - `key`   – the property form field (camelCase RHF key)
 *  - `field` – the backend/`Property` field (snake_case)
 *  - `i18n`  – the label key shown in review / conflict UI
 *  - `get`   – extracts the field from a raw extraction as a display string (or undefined) */
export interface PropertyScanField {
  key: string;
  field: string;
  i18n: string;
  get: (p: ExtractedProperty) => string | undefined;
}

/** Backend fields whose stored value is numeric — the diff coerces the scanned string back to a
 *  number when writing an update payload. */
export const NUMERIC_PROPERTY_FIELDS = new Set([
  'sq_ft',
  'number_of_rooms',
  'floor',
  'property_tax',
  'house_committee',
]);

const str = (v: string | number | null | undefined): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

export const PROPERTY_SCAN_FIELDS: PropertyScanField[] = [
  { key: 'address', field: 'address', i18n: 'property.address', get: (p) => str(p.address) },
  { key: 'city', field: 'city', i18n: 'property.city', get: (p) => str(p.city) },
  { key: 'zipCode', field: 'zip_code', i18n: 'property.zipCode', get: (p) => str(p.zip_code) },
  { key: 'type', field: 'type', i18n: 'property.type', get: (p) => p.type ?? undefined },
  { key: 'sqFt', field: 'sq_ft', i18n: 'property.sqFt', get: (p) => str(p.sq_ft) },
  { key: 'numberOfRooms', field: 'number_of_rooms', i18n: 'property.numberOfRooms', get: (p) => str(p.number_of_rooms) },
  { key: 'floor', field: 'floor', i18n: 'property.floor', get: (p) => str(p.floor) },
  { key: 'apartment', field: 'apartment', i18n: 'property.apartment', get: (p) => str(p.apartment) },
  { key: 'block', field: 'block', i18n: 'property.block', get: (p) => str(p.block) },
  { key: 'plot', field: 'plot', i18n: 'property.plot', get: (p) => str(p.plot) },
  { key: 'propertyOwner', field: 'property_owner', i18n: 'property.owner', get: (p) => str(p.property_owner) },
  { key: 'inventoryNotes', field: 'inventory_notes', i18n: 'property.inventoryNotes', get: (p) => str(p.inventory_notes) },
  { key: 'electricityMeterNumber', field: 'electricity_meter_number', i18n: 'property.electricityMeterNumber', get: (p) => str(p.electricity_meter_number) },
  { key: 'electricityAccountNumber', field: 'electricity_account_number', i18n: 'property.electricityAccountNumber', get: (p) => str(p.electricity_account_number) },
  { key: 'waterMeterNumber', field: 'water_meter_number', i18n: 'property.waterMeterNumber', get: (p) => str(p.water_meter_number) },
  { key: 'waterAccountNumber', field: 'water_account_number', i18n: 'property.waterAccountNumber', get: (p) => str(p.water_account_number) },
  { key: 'propertyTax', field: 'property_tax', i18n: 'property.propertyTax', get: (p) => str(p.property_tax) },
  { key: 'houseCommittee', field: 'house_committee', i18n: 'property.houseCommittee', get: (p) => str(p.house_committee) },
  { key: 'parkingNumbersStr', field: 'parking_numbers', i18n: 'property.parkingNumbers', get: (p) => (p.parking_numbers && p.parking_numbers.length ? p.parking_numbers.join(', ') : undefined) },
];
