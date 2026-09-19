import type { TFunction } from 'i18next';
import { indexLabelKey } from '@/shared/utils/indexLabels';

/** Enum renter fields whose stored/scanned values are codes (not human text). Maps each code to the
 *  same i18n label the renter form already uses (see `LeaseTermBuilder`), so the keep/use-lease
 *  toggle shows a translated value instead of a raw code like `cpi` or `wire_transfer`. */
const ENUM_LABELS: Record<string, Record<string, string>> = {
  escalationMode: {
    none: 'renter.rentChangeSame',
    same: 'renter.rentChangeSame',
    percent: 'renter.rentChangePercent',
    fixed: 'renter.rentChangeFixed',
    cpi: 'renter.rentChangeCpi',
    custom: 'renter.rentChangeCustom',
  },
  insuranceType: {
    wire_transfer: 'renter.insuranceTypeWireTransfer',
    bank_guarantee: 'renter.insuranceTypeBankGuarantee',
  },
  // Includes the legacy 'wire_transfer' alias, which stored renters can still carry.
  paymentType: {
    cash: 'transactions.paymentMethodCash',
    bank_transfer: 'transactions.paymentMethodBankTransfer',
    wire_transfer: 'transactions.paymentMethodBankTransfer',
    bit: 'transactions.paymentMethodBit',
    check: 'transactions.paymentMethodCheck',
  },
  paymentFrequency: {
    monthly: 'renter.frequencyMonthly',
    quarterly: 'renter.frequencyQuarterly',
    yearly: 'renter.frequencyYearly',
  },
};

/** Translate a conflict field's display value: known enum codes become their label, everything else
 *  (numbers, dates, free text) passes through unchanged. Display-only — the diff still compares the
 *  raw strings, so this never affects which fields are flagged as conflicts. */
export function formatConflictValue(formKey: string, value: string, t: TFunction): string {
  // The index-linked mode is named by the country, not by the table above — the table holds
  // Israel's key as the fallback. See `indexLabels.ts`.
  const key =
    formKey === 'escalationMode' && value === 'cpi'
      ? indexLabelKey()
      : ENUM_LABELS[formKey]?.[value];
  return key ? t(key) : value;
}
