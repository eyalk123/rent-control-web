import { z } from 'zod';

const nonEmptyTrimmed = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, { message: 'common.required' });

const optionalString = z.string().transform((val) => (val ?? '').trim()).default('');

export const supplierFormSchema = z.object({
  name: nonEmptyTrimmed,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
  categoryIds: z
    .array(z.number())
    .min(1, { message: 'At least one category is required' }),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
