import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, TrendingUp } from 'lucide-react';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { LeaseYearAmountField } from '@/shared/components/form/LeaseYearAmountField';
import { LeaseYearTypeText } from '@/shared/components/form/LeaseYearTypeText';
import { EscalationValueField } from '@/shared/components/form/EscalationValueField';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { formatMoney } from '@/shared/utils/money';
import type { LeaseYearRuleMode, LeaseYearType } from '@/shared/types';

/**
 * The per-year rule options, in display order. Mirrors the whole-lease choices in
 * RENT_ESCALATION_MODES (minus `custom`, which has no meaning for a single year), plus
 * `manual` — the neutral default, meaning "this amount was typed, not derived".
 */
export const LEASE_YEAR_RULE_MODES: LeaseYearRuleMode[] = [
  'manual',
  'none',
  'percent',
  'fixed',
  'cpi',
];

export const LEASE_YEAR_RULE_LABEL_KEYS: Record<LeaseYearRuleMode, string> = {
  manual: 'renter.rentChangeManual',
  none: 'renter.rentChangeSame',
  percent: 'renter.rentChangePercent',
  fixed: 'renter.rentChangeFixed',
  cpi: 'renter.rentChangeCpi',
};

interface Props {
  /** Year caption, e.g. "2026" or "Year 2". */
  label: string;
  /** Kept as a string because both callers hold amounts as form strings while typing. */
  amount: string;
  type: LeaseYearType;
  /** Highlights the row the lease is currently in. */
  isCurrent?: boolean;
  /** Editable amount when provided; a read-only formatted amount otherwise. */
  onAmountChange?: (value: string) => void;
  onAmountBlur?: () => void;
  amountName?: string;
  /** Makes the contract/option label a click-to-switch button. */
  onTypeToggle?: () => void;
  onRemove?: () => void;
  /**
   * Amounts the client can only estimate (CPI years and everything downstream of them) —
   * rendered muted with a "≈" and a CPI pill so they don't read as a firm figure.
   */
  projected?: boolean;
  /** Trailing pill, e.g. the extension drawer's "New" tag. */
  badge?: ReactNode;
  /**
   * How this year's rent derives from the previous year's. The dropdown renders only when
   * `onRuleChange` is passed (custom mode, and never on year one, which *is* the base rent).
   */
  ruleMode?: LeaseYearRuleMode;
  onRuleChange?: (mode: LeaseYearRuleMode) => void;
  /** The percent / ₪ step. Its field appears only for the `percent` and `fixed` rules. */
  ruleValue?: string;
  onRuleValueChange?: (value: string) => void;
  onRuleValueBlur?: () => void;
  /** Per-row validation message, e.g. a percent rule with no value. */
  error?: string;
}

/**
 * One lease-year row: year label, rent amount, contract/option type, and the optional
 * current-lease / projected / custom badges. Shared by the renter form (LeaseTermBuilder)
 * and the lease-extension drawer so a schedule looks and behaves the same wherever it is
 * edited. Which affordances appear is entirely driven by the handlers the caller passes.
 */
export function LeaseYearRow({
  label,
  amount,
  type,
  isCurrent = false,
  onAmountChange,
  onAmountBlur,
  amountName,
  onTypeToggle,
  onRemove,
  projected = false,
  badge,
  ruleMode = 'manual',
  onRuleChange,
  ruleValue = '',
  onRuleValueChange,
  onRuleValueBlur,
  error,
}: Props) {
  const { t } = useTranslation();
  const amountNum = Number(amount) || 0;
  const showRuleValue = ruleMode === 'percent' || ruleMode === 'fixed';

  const ruleOptions = LEASE_YEAR_RULE_MODES.map((m) => ({
    value: m,
    label: t(LEASE_YEAR_RULE_LABEL_KEYS[m]),
  }));

  return (
    <div
      className="flex flex-col gap-1 px-2 py-1.5 rounded-[8px]"
      style={isCurrent ? { background: 'var(--color-rev-bg)' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={`text-[15px] min-w-[52px] text-[var(--color-text-primary)] ${
            isCurrent ? 'font-extrabold' : 'font-semibold'
          }`}
        >
          {label}
        </span>

        {onAmountChange ? (
          <LeaseYearAmountField
            aria-label={t('renter.amount')}
            value={amount}
            onChange={onAmountChange}
            onBlur={onAmountBlur}
            name={amountName}
            placeholder={t('renter.amount')}
          />
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <LtrSpan
              className={`text-[15px] font-semibold ${
                projected ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {amountNum > 0 ? `${projected ? '≈ ' : ''}${formatMoney(amountNum)}` : '—'}
            </LtrSpan>
            {projected && (
              <Pill tone="info" size="sm" className="gap-1">
                <TrendingUp size={12} />
                {t('renter.rentChangeCpi')}
              </Pill>
            )}
          </div>
        )}

        {onRuleChange && (
          <FormSelect<LeaseYearRuleMode>
            compact
            className="w-[104px] shrink-0"
            aria-label={t('renter.yearRule')}
            value={ruleMode}
            onValueChange={onRuleChange}
            options={ruleOptions}
            error={error}
          />
        )}

        {onRuleChange && showRuleValue && onRuleValueChange && (
          <EscalationValueField
            compact
            mode={ruleMode as 'percent' | 'fixed'}
            aria-label={t('renter.yearRuleValue')}
            value={ruleValue}
            onChange={onRuleValueChange}
            onBlur={onRuleValueBlur}
          />
        )}

        {/* An editable row shows the projection pill here — its amount lives in an input, so
            the read-only branch above (which owns the other pill) never renders. */}
        {onAmountChange && projected && (
          <Pill tone="info" size="sm" className="gap-1 shrink-0">
            <TrendingUp size={12} />
            {t('renter.rentChangeCpi')}
          </Pill>
        )}

        {onTypeToggle ? (
          <button
            type="button"
            onClick={onTypeToggle}
            title={t('renter.tapToChangeType')}
            className="w-16 text-end rounded px-1 py-0.5 transition-colors hover:bg-[var(--color-input-filled-background)] underline decoration-dotted underline-offset-2"
          >
            <LeaseYearTypeText type={type} />
          </button>
        ) : (
          <LeaseYearTypeText type={type} className="w-16 text-end" />
        )}

        {isCurrent && (
          <Pill tone="revenue" size="sm">
            {t('renter.currentLease')}
          </Pill>
        )}
        {badge}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('renter.removeYear')}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-input-filled-background)]"
            style={{ color: 'var(--color-error)' }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs ps-[52px] text-[var(--color-error)]">
          {t(error, { defaultValue: error })}
        </p>
      )}
    </div>
  );
}
