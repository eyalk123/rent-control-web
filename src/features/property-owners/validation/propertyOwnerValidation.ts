import { z } from 'zod';
import { isValidBankAccount, type BankAccountValue } from '@/shared/components/form/BankAccountInput';

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
});

export type PropertyOwnerFormValues = z.infer<typeof propertyOwnerFormSchema>;
