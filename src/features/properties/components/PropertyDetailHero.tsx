import { useTranslation } from 'react-i18next';
import { Pencil, Plus, MapPin } from 'lucide-react';
import { Pill } from '@/shared/components/ui/Pill';
import { PropTile } from '@/shared/components/ui/PropTile';
import { HeroStat } from '@/shared/components/detail/HeroStat';
import { formatMoney } from '@/shared/utils/money';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  monthlyRent: number | null;
  revTotal: number;
  expTotal: number;
  onEdit: () => void;
  onAddTransaction: () => void;
}

export function PropertyDetailHero({ property, monthlyRent, revTotal, expTotal, onEdit, onAddTransaction }: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-4 items-start">
          <PropTile propertyId={property.id} imageUrl={property.image_url} width={160} height={120} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill tone={property.hasRenters ? 'success' : 'warning'} size="md">
                {property.hasRenters ? t('property.occupancy.occupied') : t('property.occupancy.vacant')}
              </Pill>
              <Pill tone="neutral" size="md">{t(`property.type_${property.type}` as never, property.type)}</Pill>
            </div>
            <h1 className="text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
              {property.address}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin size={13} />
              {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
              {property.property_owner && <> · {t('property.ownedBy', { owner: property.property_owner })}</>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          >
            <Pencil size={14} /> {t('common.edit')}
          </button>
          <button
            onClick={onAddTransaction}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('property.addTransaction')}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <HeroStat label={t('property.monthlyRent')} value={monthlyRent ? formatMoney(monthlyRent) : '—'} />
        <HeroStat label={t('property.size')} value={property.sq_ft ? `${property.sq_ft}m²` : '—'} />
        <HeroStat label={t('property.totalRevenue')} value={formatMoney(revTotal)} tone="success" sub={t('common.allTime')} />
        <HeroStat label={t('property.totalExpenses')} value={formatMoney(expTotal)} tone="danger" sub={t('common.allTime')} />
      </div>
    </>
  );
}
