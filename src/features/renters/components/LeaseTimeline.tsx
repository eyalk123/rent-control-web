import { useTranslation } from 'react-i18next';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { getLeaseEndDate } from '@/shared/types';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
}

export function LeaseTimeline({ renter }: Props) {
  const { t } = useTranslation();
  const years = renter.lease_years ?? [];
  const leaseEnd = getLeaseEndDate(renter);
  const leaseStart = renter.lease_start;

  const yearsLabel = years.length === 1 ? t('renter.yearsCount', { count: 1 }) : t('renter.yearsCount_plural', { count: years.length });

  return (
    <DetailPanel title={t('renter.leaseTimeline')}>
      <div className="p-5">
        {/* Date range header */}
        <div className="flex items-center justify-between mb-3 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{leaseStart ? fmtDate(leaseStart) : '—'} → {leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : '—'}</span>
          <span>{yearsLabel}</span>
        </div>

        {/* Year strip */}
        <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
          {years.map((y, i) => {
            const isCurrent = isCurrentLeaseYear(leaseStart, i);
            const isOption = y.type === 'option';
            const bgColor = isCurrent ? 'var(--color-rev-bg)' : isOption ? 'var(--color-input-filled-background)' : 'var(--color-surface)';
            const typeLabel = isOption ? t('renter.optionYear') : t('renter.contractYear');
            return (
              <div
                key={i}
                className="flex-1 relative px-2.5 py-3"
                style={{ background: bgColor, borderInlineEnd: i === years.length - 1 ? 'none' : '1px solid var(--color-outline)' }}
              >
                {isCurrent && (
                  <span className="absolute top-1.5 end-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-rev-fg)' }}>{t('renter.currentLease')}</span>
                )}
                <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{getLeaseYearLabel(leaseStart, i)}</p>
                <LtrSpan className="text-[16px] font-bold mt-1 block" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(y.amount)}</LtrSpan>
                <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: isOption ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                  {typeLabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {[
            { color: 'var(--color-rev-bg)', label: t('renter.currentYear') },
            { color: 'var(--color-surface)', label: t('renter.contractYear'), border: true },
            { color: 'var(--color-input-filled-background)', label: t('renter.optionYear') },
          ].map(({ color, label, border }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: color, border: border ? '1px solid var(--color-outline)' : 'none' }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}
