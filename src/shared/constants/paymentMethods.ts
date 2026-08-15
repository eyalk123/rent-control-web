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
// Maps a stored value onto the canonical PaymentMethod domain, treating 'wire_transfer' as a
// legacy alias for 'bank_transfer', and returns null for anything it cannot place. Use this
// when seeding a form default, where leaving the field blank for the user to pick is better
// than silently guessing — and where an unmapped value would be set on a <Select> that has no
// matching option, rendering an empty trigger and later failing the API's enum on submit.
export function toPaymentMethodOrNull(value?: string | null): PaymentMethod | null {
  if (value === 'wire_transfer') return 'bank_transfer';
  return PAYMENT_METHOD_VALUES.includes(value as PaymentMethod) ? (value as PaymentMethod) : null;
}

// Same mapping, but for callers that must produce a value (e.g. creating a transaction
// outright rather than prefilling a form). Unknown/empty values fall back to 'cash'.
export function normalizePaymentType(value?: string | null): PaymentMethod {
  return toPaymentMethodOrNull(value) ?? 'cash';
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
