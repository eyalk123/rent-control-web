import { useTranslation } from 'react-i18next';
import { Pencil, Plus, MapPin, Trash2, Lock } from 'lucide-react';
import { LockedAction, LockedBadge } from '@/features/subscription/components/LockedBadge';
import { Pill } from '@/shared/components/ui/Pill';
import { PropTile } from '@/shared/components/ui/PropTile';
import { HeroStat } from '@/shared/components/detail/HeroStat';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { RenterRentStat } from './RenterRentStat';
import { formatMoney } from '@/shared/utils/money';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  monthlyRent: number | null;
  /** Net/revenue/expense totals cover the current calendar year only. */
  revTotal: number;
  expTotal: number;
  /** Calendar year those three totals are for, shown in their labels. */
  year: string;
  renterName: string | null;
  rentersCount: number;
  /** Transaction totals (net/revenue/expenses) are still loading. */
  statsLoading?: boolean;
  onEdit: () => void;
  onAddTransaction: () => void;
  onDelete: () => void;
}

export function PropertyDetailHero({ property, monthlyRent, revTotal, expTotal, year, renterName, rentersCount, statsLoading, onEdit, onAddTransaction, onDelete }: Props) {
  // Read straight off the property the API returned, so the badge here and the badge in
  // the list come from one server-side resolution and cannot disagree.
  const locked = Boolean(property.locked);
  const { t } = useTranslation();
  const statsAnchorRef = useTourAnchor(ANCHORS.propertyDetailStats);

  return (
    <>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
          <PropTile propertyId={property.id} imageUrl={property.image_url} width={200} height={150} fit="cover" className="shadow-lg ring-1 ring-black/5" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill tone={property.hasRenters ? 'success' : 'warning'} size="md">
                {property.hasRenters ? t('property.occupancy.occupied') : t('property.occupancy.vacant')}
              </Pill>
              <Pill tone="neutral" size="md">{t(`property.type_${property.type}` as never, property.type)}</Pill>
              {locked && <LockedBadge />}
            </div>
            <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
              {property.address}
              <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(property, t)}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin size={13} />
              {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
              {property.property_owner && <> · {t('property.ownedBy', { owner: property.property_owner })}</>}
            </div>
          </div>
        </div>

        {/* Action buttons.

            On a locked property these are disabled with a lock and a reason on hover,
            never removed. A button that vanishes leaves someone hunting for a feature
            they used last week; a disabled one that explains itself is the difference
            between a limit and a bug.

            Delete stays live deliberately: removing a property is how an over-limit
            account gets back under its ceiling, so blocking it would trap them. */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <LockedAction locked={locked}>
            <button
              onClick={onEdit}
              disabled={locked}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              {locked ? <Lock size={14} /> : <Pencil size={14} />} {t('common.edit')}
            </button>
          </LockedAction>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent' }}
          >
            <Trash2 size={14} /> {t('common.delete')}
          </button>
          <LockedAction locked={locked}>
            <button
              onClick={onAddTransaction}
              disabled={locked}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)' }}
            >
              {locked ? <Lock size={14} /> : <Plus size={14} />} {t('property.addTransaction')}
            </button>
          </LockedAction>
        </div>
      </div>

      {/* KPI strip */}
      <div ref={statsAnchorRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <RenterRentStat
          renters={property.renters ?? []}
          renterName={renterName}
          rentersCount={rentersCount}
          total={monthlyRent}
        />
        <HeroStat label={t('property.monthlyRent')} value={monthlyRent ? formatMoney(monthlyRent) : '—'} />
        <HeroStat label={t('property.net', { year })} value={formatMoney(revTotal - expTotal)} tone={revTotal - expTotal >= 0 ? 'success' : 'danger'} loading={statsLoading} />
        <HeroStat label={t('property.totalRevenue', { year })} value={formatMoney(revTotal)} tone="success" loading={statsLoading} />
        <HeroStat label={t('property.totalExpenses', { year })} value={formatMoney(expTotal)} tone="danger" loading={statsLoading} />
      </div>
    </>
  );
}
