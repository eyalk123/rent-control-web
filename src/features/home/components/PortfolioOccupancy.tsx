import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Property } from '@/shared/types';

interface Props {
  properties: Property[];
}

export function PortfolioOccupancy({ properties }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const occupiedCount = properties.filter((p) => p.hasRenters).length;
  const occupancyPct = properties.length > 0
    ? Math.round((occupiedCount / properties.length) * 100)
    : 0;
  const occupancyColor =
    occupancyPct >= 80 ? '#4ADE80' : occupancyPct >= 50 ? '#FACC15' : '#FCA5A5';

  return (
    <div className="rounded-[var(--radius-card)] p-6 flex flex-col" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-75 mb-2">{t('home.portfolioOccupancy')}</p>
      <p className="text-6xl font-bold leading-none tracking-tight" style={{ letterSpacing: '-1px', color: occupancyColor }}>
        {occupancyPct}%
      </p>
      <p className="text-sm opacity-65 mt-1">{t('home.occupancyMeta', { occupied: occupiedCount, total: properties.length })}</p>

      <div className="flex gap-1.5 mt-auto pt-5">
        {properties.slice(0, 8).map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/properties/${p.id}`)}
            title={p.address}
            className="flex-1 h-6 rounded-[4px] min-w-0 transition-opacity hover:opacity-80"
            style={{ background: p.hasRenters ? '#4ADE80' : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[11px] opacity-55">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#4ADE80' }} />{t('home.occupied')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.25)' }} />{t('home.vacant')}
        </span>
      </div>
    </div>
  );
}
