import { useTranslation } from 'react-i18next';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { EscalationValueField } from '@/shared/components/form/EscalationValueField';
import type { RentEscalationMode } from '@/shared/types';

interface Props {
  /** Caption above the toggle — the two callers word it differently (whole lease vs. new years). */
  label: string;
  mode: RentEscalationMode;
  onModeChange: (mode: RentEscalationMode) => void;
  /** Percent / ₪ step. Ignored (and hidden) in the none/cpi/custom modes. */
  value: string;
  onValueChange: (value: string) => void;
  onValueBlur?: () => void;
  className?: string;
}

/**
 * The escalation modes, in display order. Every caller offers all of them. `custom` leads
 * because it is the one that expresses a real lease — the other four are each a special case
 * of it. It is not the default; every caller sets `none` explicitly.
 */
export const RENT_ESCALATION_MODES: RentEscalationMode[] = ['custom', 'none', 'percent', 'fixed', 'cpi'];

/**
 * The "how does the rent change" control: mode toggle + the CPI explainer + the percent/₪
 * step field. Shared by the renter form (LeaseTermBuilder, driven by RHF Controllers) and
 * the lease-extension drawer (driven by useState) so the two can't drift apart on which
 * modes exist or how each one is presented.
 */
export function RentChangeField({
  label,
  mode,
  onModeChange,
  value,
  onValueChange,
  onValueBlur,
  className = '',
}: Props) {
  const { t } = useTranslation();

  const segments: { value: RentEscalationMode; label: string }[] = RENT_ESCALATION_MODES.map((m) => ({
    value: m,
    label: t(
      {
        none: 'renter.rentChangeSame',
        percent: 'renter.rentChangePercent',
        fixed: 'renter.rentChangeFixed',
        cpi: 'renter.rentChangeCpi',
        custom: 'renter.rentChangeCustom',
      }[m],
    ),
  }));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
      <SegToggle value={mode} onChange={onModeChange} options={segments} />

      {mode === 'cpi' && (
        <p className="text-[13px] leading-snug mt-1.5 text-[var(--color-text-secondary)]">
          {t('renter.rentChangeCpiNote')}
        </p>
      )}

      {(mode === 'percent' || mode === 'fixed') && (
        <EscalationValueField
          mode={mode}
          value={value}
          onChange={onValueChange}
          onBlur={onValueBlur}
          className="mt-2"
        />
      )}
    </div>
  );
}
