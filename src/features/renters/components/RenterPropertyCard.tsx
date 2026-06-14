import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { getPropertyImageSrc } from '@/features/properties/utils/propertyImageSrc';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  monthlyRent: number;
}

export function RenterPropertyCard({ property, monthlyRent }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const color = getPropertyColor(property.id);
  const bg = getPropertyColorBg(property.id, 0.35);
  const imageSrc = getPropertyImageSrc(property.image_url);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/properties/${property.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/properties/${property.id}`); }}
      className="rounded-[var(--radius-card)] overflow-hidden cursor-pointer transition-all hover:-translate-y-px text-start"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '4/3', background: imageSrc ? 'var(--color-input-filled-background)' : bg }}>
        {imageSrc ? (
          <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-contain p-3" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" fill="rgba(255,255,255,0.55)" />
              <path d="M3 11l9-8 9 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 start-3 flex gap-1.5">
          <Pill tone="success">{t('property.occupancy.occupied')}</Pill>
          <Pill tone="neutral">{t(`property.type_${property.type}` as never, property.type)}</Pill>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {property.address}
          <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(property, t)}</span>
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <MapPin size={10} />
          {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
          {property.property_owner && <> · {property.property_owner}</>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--color-outline)' }}>
          {[
            { label: t('property.rent'), value: monthlyRent ? formatMoney(monthlyRent) : '—' },
            { label: t('property.size'), value: `${property.sq_ft}m²` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
              <LtrSpan className="text-[13px] font-bold mt-0.5 block" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {String(value)}
              </LtrSpan>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
