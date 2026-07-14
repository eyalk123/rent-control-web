import { useTranslation } from 'react-i18next';

interface Props {
  /** "fixed" shows a leading ₪ affix; "percent" shows a trailing % affix. */
  mode: 'percent' | 'fixed';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Overrides the default "yearly increase" caption. */
  label?: string;
  /** Merged onto the outer row, e.g. a caller's top margin. */
  className?: string;
  /**
   * Drops the caption and shrinks the box to sit inline inside a lease-year row (36px tall).
   * Used by the per-year rule value in LeaseYearRow, where the rule dropdown beside it
   * already says what the number means.
   */
  compact?: boolean;
  'aria-label'?: string;
}

/**
 * The "yearly increase" caption + a numeric field with a ₪ (fixed) or % (percent) affix.
 * Shared by the renter form (LeaseTermBuilder) and the lease-extension drawer — the renter
 * form drives it through an RHF Controller, the extension drawer through useState.
 */
export function EscalationValueField({
  mode, value, onChange, onBlur, label, className = '', compact = false, ...rest
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      {!compact && (
        <span className="text-sm text-[var(--color-text-secondary)]">{label ?? t('renter.yearlyIncrease')}</span>
      )}
      <div
        className={`inline-flex items-center border bg-[var(--color-input-bg)] ${
          compact ? 'rounded-lg px-2 h-9 w-20' : 'rounded-xl px-3 h-10 w-32'
        }`}
        style={{ borderColor: 'var(--color-input-border)' }}
      >
        {mode === 'fixed' && <span className="text-sm text-[var(--color-text-secondary)] me-1">₪</span>}
        <input
          type="number"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="0"
          aria-label={rest['aria-label']}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--color-text-primary)]"
        />
        {mode === 'percent' && <span className="text-sm text-[var(--color-text-secondary)] ms-1">%</span>}
      </div>
    </div>
  );
}
