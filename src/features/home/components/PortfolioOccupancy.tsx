import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { formatPropertyAddress } from '@/shared/utils/propertyAddress';
import type { Property } from '@/shared/types';

interface Props {
  properties: Property[];
  loading?: boolean;
}

/** Above this many properties the per-property squares become too thin to read or click,
 *  so the strip switches to a single proportional bar. */
const MAX_SQUARES = 12;

export function PortfolioOccupancy({ properties, loading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const occupiedCount = properties.filter((p) => p.hasRenters).length;
  const vacantCount = properties.length - occupiedCount;
  const occupancyPct = properties.length > 0
    ? Math.round((occupiedCount / properties.length) * 100)
    : 0;
  const showSquares = properties.length <= MAX_SQUARES;
  const occupancyColor =
    occupancyPct >= 80
      ? 'var(--color-rev-fg)'
      : occupancyPct >= 50
        ? 'var(--color-warning)'
        : 'var(--color-exp-fg)';

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {t('home.portfolioOccupancy')}
      </p>

      <div
        className="rounded-[var(--radius-card)] p-7"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        {loading ? (
          <div className="flex items-baseline gap-3">
            <Skeleton width={120} height={52} />
            <Skeleton width={140} height={16} />
          </div>
        ) : (
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-6xl font-bold leading-none tracking-tight" style={{ letterSpacing: '-1px', color: occupancyColor }}>
              {occupancyPct}%
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('home.occupancyMeta', { occupied: occupiedCount, total: properties.length })}
            </p>
          </div>
        )}

        {showSquares ? (
          <div className="flex gap-1.5 mt-7">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/properties/${p.id}`)}
                title={formatPropertyAddress(p, t)}
                className="flex-1 h-16 rounded-[4px] min-w-0 transition-opacity hover:opacity-80"
                style={{ background: p.hasRenters ? 'var(--color-rev-fg)' : 'var(--color-outline)' }}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex h-16 mt-7 rounded-[4px] overflow-hidden"
            style={{ background: 'var(--color-outline)' }}
          >
            <div style={{ width: `${occupancyPct}%`, background: 'var(--color-rev-fg)' }} />
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--color-rev-fg)' }} />
            {showSquares ? t('home.occupied') : `${occupiedCount} ${t('home.occupied')}`}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--color-outline)' }} />
            {showSquares ? t('home.vacant') : `${vacantCount} ${t('home.vacant')}`}
          </span>
        </div>
      </div>
    </div>
  );
}
