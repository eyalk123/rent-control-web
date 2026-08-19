import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { AddMenu } from '@/shared/components/ui/AddMenu';
import { RenterMiniCard } from './RenterMiniCard';
import { getRenterLifecycle } from '@/shared/utils/renterStatus';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  onAddRenter: () => void;
  /** When provided, the empty-state add action becomes a chooser (manual / scan a lease). */
  onScanRenter?: () => void;
}

export function PropertyRentersTab({ property, onAddRenter, onScanRenter }: Props) {
  const { t } = useTranslation();
  const [showPrevious, setShowPrevious] = useState(false);
  const allRenters = property.renters ?? [];
  // Past tenants stay on the property - they are the only record of who was here and what
  // they paid - but they are folded away so the tab reads as "who is here now".
  const renters = allRenters.filter((r) => getRenterLifecycle(r) !== 'ended');
  const previousRenters = allRenters.filter((r) => getRenterLifecycle(r) === 'ended');

  if (allRenters.length === 0) {
    return (
      <EmptyState
        icon={undefined}
        title={t('property.noRentersYet')}
        description={t('property.noRentersDesc')}
        action={
          onScanRenter ? (
            <AddMenu label={t('property.addRenterAction')} onManual={onAddRenter} onScan={onScanRenter} />
          ) : (
            <button
              onClick={onAddRenter}
              className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> {t('property.addRenterAction')}
            </button>
          )
        }
      />
    );
  }

  const cards = (list: typeof allRenters) => (
    // `minmax(360px, …)` overflows on 360px-wide devices; below `sm` use a single column.
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
      {list.map((r) => (
        <RenterMiniCard
          key={r.id}
          renter={r}
          backTo={`/properties/${property.id}?tab=renters`}
          backLabel={property.address}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {renters.length > 0 ? (
        cards(renters)
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('property.noCurrentRenters')}
        </p>
      )}

      {previousRenters.length > 0 && (
        <div>
          <button
            onClick={() => setShowPrevious((v) => !v)}
            aria-expanded={showPrevious}
            className="flex items-center gap-1.5 py-1.5 text-[13px] font-medium transition-colors"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            {showPrevious ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {t('renter.previousTenants')} ({previousRenters.length})
          </button>
          {showPrevious && <div className="mt-2.5">{cards(previousRenters)}</div>}
        </div>
      )}
    </div>
  );
}
