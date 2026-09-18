import type { TFunction } from 'i18next';
import { allowedModes } from '@/shared/utils/capabilities';
import type { PaymentMethod } from '@/shared/types';

export const PAYMENT_METHOD_VALUES: PaymentMethod[] = [
  'cash',
  'bank_transfer',
  'bit',
  'check',
  'card',
  'mobile_payment',
  'other',
];

/**
 * Bit is an Israeli payment app. The array above keeps it — a transaction already recorded
 * as `bit` must keep rendering, and `fromApi` must keep accepting it — but it is not
 * offered where it does not exist.
 */
export const PAYMENT_METHOD_REQUIREMENTS: Partial<Record<PaymentMethod, 'bitPayments'>> = {
  bit: 'bitPayments',
};

/** The methods this country may actually pick. */
export const availablePaymentMethods = (): PaymentMethod[] =>
  allowedModes(PAYMENT_METHOD_VALUES, PAYMENT_METHOD_REQUIREMENTS);

/**
 * The four methods a picker offers, out of the seven a stored transaction may hold. The other
 * three exist so an imported or legacy value still renders; they were never on the menu.
 */
const PAYMENT_METHOD_PICKER: PaymentMethod[] = ['cash', 'bank_transfer', 'bit', 'check'];

/** The picker's options, narrowed to what this country can use — mobile already did this. */
export function getPaymentMethodOptions(t: TFunction) {
  return allowedModes(PAYMENT_METHOD_PICKER, PAYMENT_METHOD_REQUIREMENTS).map((value) => ({
    value,
    label: t(PAYMENT_METHOD_LABEL_KEYS[value]),
  }));
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

// Every value gets a label, gated or not: a stored `bit` transaction still has to render
// its name on an account that can no longer choose it.
const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, string> = {
  cash: 'transactions.paymentMethodCash',
  bank_transfer: 'transactions.paymentMethodBankTransfer',
  bit: 'transactions.paymentMethodBit',
  check: 'transactions.paymentMethodCheck',
  card: 'transactions.paymentMethodCard',
  mobile_payment: 'transactions.paymentMethodMobilePayment',
  other: 'transactions.paymentMethodOther',
};

// Localized label for a stored payment value, honoring the legacy 'wire_transfer' alias.
// Falls back to the raw value for anything unrecognized.
export function getPaymentMethodLabel(value: string | null | undefined, t: TFunction): string {
  if (value == null || value === '') return '';
  const canonical = value === 'wire_transfer' ? 'bank_transfer' : value;
  const key = PAYMENT_METHOD_LABEL_KEYS[canonical as PaymentMethod];
  return key ? t(key) : value;
}
