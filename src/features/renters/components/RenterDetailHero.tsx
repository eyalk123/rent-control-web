import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Phone, Mail, Building2, Trash2 } from 'lucide-react';
import { Pill } from '@/shared/components/ui/Pill';
import { HeroStat } from '@/shared/components/detail/HeroStat';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
  pillTone: 'danger' | 'warning' | 'success';
  pillLabel: string;
  monthly: number;
  days: number | null;
  leaseEnd: Date | null;
  totalPaid: number;
  paymentsCount: number;
  /** Payment totals are still loading. */
  statsLoading?: boolean;
  onEdit: () => void;
  onRecordPayment: () => void;
  onDelete: () => void;
}

export function RenterDetailHero({ renter, pillTone, pillLabel, monthly, days, leaseEnd, totalPaid, paymentsCount, statsLoading, onEdit, onRecordPayment, onDelete }: Props) {
  const { t } = useTranslation();
  const avatarColor = getPropertyColor(renter.id);
  const avatarBg = getPropertyColorBg(renter.id, 0.18);

  return (
    <>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div className="flex gap-4 items-start">
          {/* Large avatar */}
          <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full text-[28px] font-bold" style={{ background: avatarBg, color: avatarColor }}>
            {(renter.first_name[0] + renter.last_name[0]).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill tone={pillTone} size="md">{pillLabel}</Pill>
              {renter.lease_start && (
                <Pill tone="neutral" size="md">{t('renter.since', { date: fmtDate(renter.lease_start) })}</Pill>
              )}
            </div>
            <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
              {renter.first_name} {renter.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              {renter.property && (
                <span className="inline-flex items-center gap-1.5"><Building2 size={13} /> {renter.property.address}{formatFloorApartment(renter.property, t)}</span>
              )}
              <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {renter.phone}</span>
              <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {renter.email}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          >
            <Pencil size={14} /> {t('common.edit')}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent' }}
          >
            <Trash2 size={14} /> {t('common.delete')}
          </button>
          <button
            onClick={onRecordPayment}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('renter.recordPayment')}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <HeroStat label={t('renter.monthlyRent')} value={formatMoney(monthly)} />
        <HeroStat
          label={t('renter.leaseEndsIn')}
          value={days != null ? t('renter.leaseEndsInDays', { days }) : '—'}
          sub={leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : undefined}
          tone={days != null && days < 90 ? 'warning' : undefined}
        />
        <HeroStat label={t('renter.totalPaid')} value={formatMoney(totalPaid)} sub={t('renter.paymentsCount', { count: paymentsCount })} tone="success" loading={statsLoading} />
      </div>
    </>
  );
}
