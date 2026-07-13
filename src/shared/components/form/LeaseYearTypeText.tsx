import { useTranslation } from 'react-i18next';
import type { LeaseYearType } from '@/shared/types';

interface Props {
  type: LeaseYearType;
  /** Extra classes merged after the tone color, e.g. per-row width/alignment. */
  className?: string;
}

/**
 * The "contract" / "option" year label shared by the renter form (LeaseTermBuilder) and the
 * lease-extension drawer — option is warning-toned, contract is muted. Callers own any
 * wrapping (a plain span position vs. a tappable toggle) and pass layout via `className`.
 */
export function LeaseYearTypeText({ type, className = '' }: Props) {
  const { t } = useTranslation();
  const isOption = type === 'option';

  return (
    <span
      className={`text-[13px] font-semibold ${className}`.trim()}
      style={{ color: isOption ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}
    >
      {isOption ? t('renter.option') : t('renter.contract')}
    </span>
  );
}
