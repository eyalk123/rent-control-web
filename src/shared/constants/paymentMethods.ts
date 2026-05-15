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
