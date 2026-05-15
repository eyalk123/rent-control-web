import { z } from 'zod';

export const revenueFormSchema = z.object({
  propertyId: z.number({ invalid_type_error: 'common.required' }).nullable().refine((v) => v !== null, {
    message: 'common.required',
  }),
  renterId: z.number().nullable(),
  amount: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0),
  monthFor: z.string().min(1, 'common.required'),
  dateOfPayment: z.string().min(1, 'common.required'),
  paymentMethod: z.string(),
  notes: z.string(),
});
