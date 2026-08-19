import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Phone, Mail, Building2, Trash2, CalendarPlus, CalendarX, RotateCcw } from 'lucide-react';
import { Pill } from '@/shared/components/ui/Pill';
import { HeroStat } from '@/shared/components/detail/HeroStat';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { getRenterLifecycle, isTerminated } from '@/shared/utils/renterStatus';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
  pillTone: 'danger' | 'warning' | 'success' | 'neutral';
  pillLabel: string;
  monthly: number;
  days: number | null;
  leaseEnd: Date | null;
  /** Revenue/expense totals cover the current calendar year only. */
  totalRevenue: number;
  totalExpenses: number;
  /** Calendar year the two totals are for, shown in their labels. */
  year: string;
  /** Payment totals are still loading. */
  statsLoading?: boolean;
  /** Total collected across the whole tenancy - replaces the year totals once it ends. */
  lifetimeRevenue: number;
  /** Whole months between lease start and the effective end. */
  monthsTenanted: number | null;
  onEdit: () => void;
  onExtendLease: () => void;
  onAddTransaction: () => void;
  onDelete: () => void;
  onEndLease: () => void;
  onReopenLease: () => void;
  /** A terminate/reopen call is in flight. */
  lifecyclePending?: boolean;
}

export function RenterDetailHero({ renter, pillTone, pillLabel, monthly, days, leaseEnd, totalRevenue, totalExpenses, year, statsLoading, lifetimeRevenue, monthsTenanted, onEdit, onExtendLease, onAddTransaction, onDelete, onEndLease, onReopenLease, lifecyclePending }: Props) {
  const { t } = useTranslation();
  // An ended lease has nothing left to extend or chase, and a days-until-expiry countdown
  // on it is noise. Edit and Delete stay - a past tenancy's record can still need
  // correcting - and the forward-looking stats swap for backward-looking ones.
  const ended = getRenterLifecycle(renter) === 'ended';
  const terminated = isTerminated(renter);
  const avatarColor = getPropertyColor(renter.id);
  const avatarBg = getPropertyColorBg(renter.id, 0.18);

  return (
    <>
      {ended && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 px-4 py-3 rounded-xl"
          style={{
            background: 'var(--color-input-filled-background)',
            border: '1px solid var(--color-outline)',
          }}
        >
          <CalendarX size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {terminated && renter.terminated_on
                ? t('renter.terminatedLease', { date: fmtDate(renter.terminated_on) })
                : t('renter.endedLease', {
                    date: leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : '\u2014',
                  })}
            </p>
            {renter.termination_reason && (
              <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('renter.terminatedReason', { reason: renter.termination_reason })}
              </p>
            )}
          </div>
          {terminated && (
            <button
              onClick={onReopenLease}
              disabled={lifecyclePending}
              className="flex items-center gap-1.5 h-8 px-3 rounded-[9px] text-[12.5px] font-medium transition-colors disabled:opacity-50"
              style={{
                border: '1px solid var(--color-outline)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface)',
              }}
            >
              <RotateCcw size={13} /> {t('renter.reopenLease')}
            </button>
          )}
        </div>
      )}

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
          {!ended && (
            <>
              <button
                onClick={onExtendLease}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
              >
                <CalendarPlus size={14} /> {t('renter.extendLease')}
              </button>
              {/* Not styled destructive: ending a tenancy is a lifecycle event, and making
                  it look like Delete pushes people back to editing the lease term by hand. */}
              <button
                onClick={onEndLease}
                disabled={lifecyclePending}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
              >
                <CalendarX size={14} /> {t('renter.endLease')}
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent' }}
          >
            <Trash2 size={14} /> {t('common.delete')}
          </button>
          {/* Still offered on an ended lease: the final month's rent often lands late. */}
          <button
            onClick={onAddTransaction}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('renter.addTransaction')}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <HeroStat label={t('renter.monthlyRent')} value={formatMoney(monthly)} />
        {ended ? (
          <HeroStat
            label={t('renter.monthsTenanted')}
            value={monthsTenanted != null ? String(monthsTenanted) : '—'}
            sub={leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : undefined}
          />
        ) : (
          <HeroStat
            label={t('renter.leaseEndsIn')}
            value={days != null ? t('renter.leaseEndsInDays', { days }) : '—'}
            sub={leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : undefined}
            tone={days != null && days < 90 ? 'warning' : undefined}
          />
        )}
        {ended ? (
          <HeroStat label={t('renter.totalCollected')} value={formatMoney(lifetimeRevenue)} tone="success" loading={statsLoading} />
        ) : (
          <HeroStat label={t('renter.totalRevenue', { year })} value={formatMoney(totalRevenue)} tone="success" loading={statsLoading} />
        )}
        <HeroStat label={t('renter.totalExpenses', { year })} value={formatMoney(totalExpenses)} tone="danger" loading={statsLoading} />
      </div>
    </>
  );
}
