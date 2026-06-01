import { z } from "zod";

const nonEmptyTrimmed = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, { message: "common.required" });

// Optional fields are often bound to Controller inputs (selects, wheel pickers) that
// start as `undefined`; coerce undefined → '' so validation never rejects a blank optional.
const optionalString = z
  .string()
  .optional()
  .transform((val) => (val ?? "").trim());

const optionalNumericString = z
  .string()
  .optional()
  .transform((val) => (val ?? "").trim())
  .refine(
    (val) => val === "" || !Number.isNaN(Number(val)),
    { message: "mustBeNumber" },
  );

const leaseYearSchema = z.object({
  amount: optionalNumericString,
  type: z.enum(["option", "contract"]).optional(),
});

const extraContactSchema = z.object({
  name: z.string().transform((v) => v.trim()),
  phone: z.string().transform((v) => v.trim()),
});

export const renterFormSchema = z.object({
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  phone: nonEmptyTrimmed,
  email: optionalString,
  leaseStart: z
    .string()
    .optional()
    .transform((val) => (val ?? "").trim())
    .refine(
      (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: "dateFormatInvalid" },
    ),
  propertyId: optionalString,
  paymentType: optionalString,
  paymentFrequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  paymentDayOfMonth: optionalNumericString,
  insuranceType: z.enum(['wire_transfer', 'bank_guarantee', '']).optional(),
  insuranceAmount: optionalNumericString,
  leaseYears: z.array(leaseYearSchema).default([{ amount: '', type: 'contract' }]),
  extraContacts: z.array(extraContactSchema).default([]),
  idImageUrl: z.string().nullable().optional(),
  fullContractUrl: z.string().nullable().optional(),
});

export type RenterFormValues = z.infer<typeof renterFormSchema>;
