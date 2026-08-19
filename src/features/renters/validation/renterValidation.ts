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

// Day of month rent is due. Mirrors the backend's RenterCreate.payment_day_in_range (1..31)
// so a bad value (typed, or prefilled by a lease scan) is caught here instead of only as a
// 422 at submit. The `min`/`max` attrs on the number input are inert — zodResolver gates
// submit, so native constraint validation never runs.
const optionalPaymentDay = optionalNumericString.refine(
  (val) => {
    if (val === "") return true;
    const n = Number(val);
    return Number.isInteger(n) && n >= 1 && n <= 31;
  },
  // Full i18n key: FormInput renders the message via t(error), and the string lives at
  // validation.paymentDayInvalid in en.json / he.json.
  { message: "validation.paymentDayInvalid" },
);

// How one lease year's rent derives from the previous year's — only used in "custom" mode.
// `percent` and `fixed` are the only rules that need a number to go with them; the rest
// ("manual" = the owner typed the amount, "none" = same as last year, "cpi" = the server
// prices it from the index) carry no value.
const leaseYearRuleSchema = z
  .object({
    mode: z.enum(["manual", "none", "percent", "fixed", "cpi"]),
    value: optionalNumericString,
  })
  .superRefine((rule, ctx) => {
    if ((rule.mode === "percent" || rule.mode === "fixed") && rule.value === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "renter.ruleValueRequired",
      });
    }
  });

const leaseYearSchema = z.object({
  amount: optionalNumericString,
  type: z.enum(["option", "contract"]).optional(),
  rule: leaseYearRuleSchema.optional(),
  // Absent means a full twelve months; only a short tail period carries it.
  months: z.number().int().min(1).max(12).optional(),
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
  // Payment frequency is optional; its default is '' (nothing picked). Include '' in the
  // enum — like insuranceType below — so a blank selection doesn't silently block submit.
  paymentFrequency: z.enum(['monthly', 'quarterly', 'yearly', '']).optional(),
  paymentDayOfMonth: optionalPaymentDay,
  insuranceType: z.enum(['wire_transfer', 'bank_guarantee', '']).optional(),
  insuranceAmount: optionalNumericString,
  contractTermYears: optionalNumericString,
  // Odd months on top of the whole years, 0-11. The steppers clamp to that range, so
  // this only has to survive a hand-edited or stale persisted value.
  contractTermMonths: optionalNumericString,
  optionYears: optionalNumericString,
  optionTermMonths: optionalNumericString,
  baseRent: optionalNumericString,
  escalationMode: z.enum(['none', 'percent', 'fixed', 'custom', 'cpi']).optional(),
  escalationValue: optionalNumericString,
  leaseYears: z.array(leaseYearSchema).default([{ amount: '', type: 'contract' }]),
  extraContacts: z.array(extraContactSchema).default([]),
  idImageUrl: z.string().nullable().optional(),
  fullContractUrl: z.string().nullable().optional(),
});

export type RenterFormValues = z.infer<typeof renterFormSchema>;
