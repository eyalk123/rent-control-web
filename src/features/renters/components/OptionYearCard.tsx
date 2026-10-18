import { useTranslation } from 'react-i18next';
import { CalendarCheck } from 'lucide-react';
import type { Renter } from '@/shared/types';
import { nextOptionIndex } from '@/shared/utils/leaseSchedule';
import { leaseYearStart } from '@/shared/utils/leaseYear';
import { isOptionDecisionDue } from '@/shared/utils/renterStatus';
import { fmtDate, toISODate } from '@/shared/utils/dates';
import { formatMoney } from '@/shared/utils/money';

interface Props {
  renter: Renter;
  onExercise: () => void;
}

/**
 * "The next option year is the owner's to confirm" — shown above the lease timeline from a
 * month before it starts, so taking it up doesn't mean opening Extend and flipping a row by hand.
 */
export function OptionYearCard({ renter, onExercise }: Props) {
  const { t } = useTranslation();
  if (!isOptionDecisionDue(renter)) return null;

  const index = nextOptionIndex(renter.lease_years);
  const start = leaseYearStart(renter.lease_start, renter.lease_years, index);

  return (
    <section
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] px-[18px] py-3.5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <CalendarCheck size={18} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('renter.optionYearAvailable')}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('renter.optionYearAvailableDetail', {
            start: start ? fmtDate(toISODate(start)) : '—',
            amount: formatMoney(renter.lease_years[index].amount),
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={onExercise}
        className="h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90"
        style={{ background: 'var(--color-primary)' }}
      >
        {t('renter.exerciseOption')}
      </button>
    </section>
  );
}
