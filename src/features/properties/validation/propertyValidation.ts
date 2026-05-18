import { z } from 'zod';
import type { PropertyType } from '@/shared/types';

export const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'commercial', 'garden_apartment'];

const nonEmptyTrimmed = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, { message: 'common.required' });

const optionalNumericString = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val === '' || !Number.isNaN(Number(val)), { message: 'mustBeNumber' });

export const propertyFormSchema = z.object({
  address: nonEmptyTrimmed,
  city: nonEmptyTrimmed,
  zipCode: z.string().transform((val) => val.trim()),
  type: z.custom<PropertyType | undefined>((val) => val === undefined || val === '' || (typeof val === 'string' && PROPERTY_TYPES.includes(val as PropertyType)), {
    message: 'invalidType',
  }).optional(),
  sqFt: optionalNumericString,
  numberOfRooms: optionalNumericString,
  parkingNumbersStr: z.string().transform((val) => val ?? ''),
  propertyOwner: z.string().transform((val) => val.trim()),
  inventoryNotes: z.string().transform((val) => val ?? ''),
  electricityMeterNumber: z.string().transform((val) => val.trim()),
  electricityAccountNumber: z.string().transform((val) => val.trim()),
  waterMeterNumber: z.string().transform((val) => val.trim()),
  waterAccountNumber: z.string().transform((val) => val.trim()),
  propertyTax: optionalNumericString,
  houseCommittee: optionalNumericString,
  basicContractUrl: z.string().nullable().optional(),
  landRegistryUrl: z.string().nullable().optional(),
  floor: optionalNumericString,
  apartment: z.string().transform((val) => val.trim()),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
