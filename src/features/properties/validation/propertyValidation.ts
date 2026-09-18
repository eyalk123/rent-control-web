import { z } from 'zod';
import { allowedModes } from '@/shared/utils/capabilities';
import type { PropertyType } from '@/shared/types';

export const PROPERTY_TYPES: PropertyType[] = [
  'apartment',
  'house',
  'commercial',
  'garden_apartment',
  'housing_unit',
  'condo_townhouse',
  'room',
  'other',
];

/**
 * Garden Apartment and Housing Unit are Israeli categories — they mean nothing to a
 * landlord elsewhere, and the skimmed set replaces them with Condo / Townhouse, Room and
 * Other.
 *
 * The array above keeps all eight. An existing property can hold any of them and must keep
 * rendering, and the enum values cannot be dropped from the database anyway. Only the
 * picker and the filter narrow — and because both now derive from this one list, the
 * Housing Unit filter bug (it was missing from the Properties table's Type dropdown)
 * disappears for Israel as a side effect.
 */
export const PROPERTY_TYPE_REQUIREMENTS: Partial<Record<PropertyType, 'israeliPropertyTypes'>> = {
  garden_apartment: 'israeliPropertyTypes',
  housing_unit: 'israeliPropertyTypes',
};

/** The types this country may actually pick. */
export const availablePropertyTypes = (): PropertyType[] =>
  allowedModes(PROPERTY_TYPES, PROPERTY_TYPE_REQUIREMENTS);

const nonEmptyTrimmed = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, { message: 'common.required' });

// Optional fields are often bound to Controller inputs (selects, chip/creatable inputs) that
// start as `undefined`; coerce undefined → '' so validation never rejects a blank optional.
const optionalString = z
  .string()
  .optional()
  .transform((val) => (val ?? '').trim());

const optionalNumericString = z
  .string()
  .optional()
  .transform((val) => (val ?? '').trim())
  .refine((val) => val === '' || !Number.isNaN(Number(val)), { message: 'mustBeNumber' });

export const propertyFormSchema = z.object({
  address: nonEmptyTrimmed,
  city: nonEmptyTrimmed,
  // Free text, not numeric. Israel's block and parcel are digits; a UK title number and a
  // cadastral reference are not, and the column has always been a string. See the note on
  // the fields in PropertyFormDrawer.
  block: optionalString,
  plot: optionalString,
  zipCode: optionalString,
  type: z.custom<PropertyType>((val) => typeof val === 'string' && PROPERTY_TYPES.includes(val as PropertyType), {
    message: 'common.required',
  }),
  sqFt: optionalNumericString,
  numberOfRooms: optionalNumericString,
  parkingNumbersStr: optionalString,
  propertyOwner: optionalString,
  inventoryNotes: optionalString,
  electricityMeterNumber: optionalString,
  electricityAccountNumber: optionalString,
  waterMeterNumber: optionalString,
  waterAccountNumber: optionalString,
  propertyTax: optionalNumericString,
  houseCommittee: optionalNumericString,
  basicContractUrl: z.string().nullable().optional(),
  landRegistryUrl: z.string().nullable().optional(),
  floor: optionalNumericString,
  apartment: optionalString,
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
