import type { TFunction } from 'i18next';
import type { PaymentMethod } from '@/shared/types';

export const PAYMENT_METHOD_VALUES: PaymentMethod[] = ['cash', 'bank_transfer', 'bit', 'check'];

export function getPaymentMethodOptions(t: TFunction) {
  return [
    { value: 'cash' as PaymentMethod, label: t('transactions.paymentMethodCash') },
    { value: 'bank_transfer' as PaymentMethod, label: t('transactions.paymentMethodBankTransfer') },
    { value: 'bit' as PaymentMethod, label: t('transactions.paymentMethodBit') },
    { value: 'check' as PaymentMethod, label: t('transactions.paymentMethodCheck') },
  ];
}

// Renter `payment_type` is a free-form string that historically diverged between clients:
// the old web form stored 'wire_transfer' while mobile/transactions use 'bank_transfer'.
// Normalize any stored value to the canonical PaymentMethod domain, treating 'wire_transfer'
// as a legacy alias for 'bank_transfer'. Unknown/empty values fall back to 'cash'.
export function normalizePaymentType(value?: string | null): PaymentMethod {
  if (value === 'wire_transfer') return 'bank_transfer';
  if (PAYMENT_METHOD_VALUES.includes(value as PaymentMethod)) return value as PaymentMethod;
  return 'cash';
}

const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, string> = {
  cash: 'transactions.paymentMethodCash',
  bank_transfer: 'transactions.paymentMethodBankTransfer',
  bit: 'transactions.paymentMethodBit',
  check: 'transactions.paymentMethodCheck',
};

// Localized label for a stored payment value, honoring the legacy 'wire_transfer' alias.
// Falls back to the raw value for anything unrecognized.
export function getPaymentMethodLabel(value: string | null | undefined, t: TFunction): string {
  if (value == null || value === '') return '';
  const canonical = value === 'wire_transfer' ? 'bank_transfer' : value;
  const key = PAYMENT_METHOD_LABEL_KEYS[canonical as PaymentMethod];
  return key ? t(key) : value;
}
