import { z } from 'zod';
import { isValidBankAccount, type BankAccountValue } from '@/shared/components/form/BankAccountInput';
import { todayISO } from '@/shared/utils/dates';

const nonEmptyTrimmed = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, { message: 'common.required' });

const optionalString = z.string().transform((val) => (val ?? '').trim()).default('');

const bankAccountSchema = z
  .object({ bank: z.string(), branch: z.string(), account: z.string() })
  .refine(
    (v) => {
      const bav = v as BankAccountValue;
      return (bav.bank === '' && bav.branch === '' && bav.account === '') || isValidBankAccount(bav);
    },
    { message: 'suppliers.invalidBankAccount' },
  );

/** The supplier form's shape without categories — including the two bank fields, of which
 *  one is always empty (see `supplierValidation.ts`). */
export const propertyOwnerFormSchema = z.object({
  name: nonEmptyTrimmed,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
  bankAccount: bankAccountSchema,
  paymentDetails: optionalString,
  // The tax comparison's questions (Israel only). All optional.
  isCompany: z.boolean(),
  birthDate: optionalString.refine(
    (val) => val === '' || (val >= '1900-01-01' && val <= todayISO()),
    { message: 'propertyOwners.tax.birthDateInvalid' },
  ),
  over60: z.boolean(),
});

export type PropertyOwnerFormValues = z.infer<typeof propertyOwnerFormSchema>;
