import { z } from 'zod';
import type { PropertyType } from '@/shared/types';

export const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'commercial', 'garden_apartment', 'housing_unit'];

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
  block: optionalNumericString,
  plot: optionalNumericString,
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
