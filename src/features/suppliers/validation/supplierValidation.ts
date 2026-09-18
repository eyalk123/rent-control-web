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
    { message: 'Invalid bank account' },
  );

export const supplierFormSchema = z.object({
  name: nonEmptyTrimmed,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
  categoryIds: z
    .array(z.number())
    .min(1, { message: 'common.required' }),
  bankAccount: bankAccountSchema,
  // The free-text alternative, used where `structuredBankDetails` is off. Kept as its own
  // field rather than widening `bankAccount` to a union: the structured value has a
  // validation rule that a free-text string can never satisfy, and one of the two is always
  // empty. Israel's path is then literally unchanged.
  //
  // No format validation on purpose — an IBAN, a routing number and a sort code have
  // nothing in common, and a wrong rule that rejects a valid account is worse than no rule.
  paymentDetails: optionalString,
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
