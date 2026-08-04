import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { AddMenu } from '@/shared/components/ui/AddMenu';
import { RenterMiniCard } from './RenterMiniCard';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  onAddRenter: () => void;
  /** When provided, the empty-state add action becomes a chooser (manual / scan a lease). */
  onScanRenter?: () => void;
}

export function PropertyRentersTab({ property, onAddRenter, onScanRenter }: Props) {
  const { t } = useTranslation();
  const renters = property.renters ?? [];

  if (renters.length === 0) {
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

  return (
    // `minmax(360px, …)` overflows on 360px-wide devices; below `sm` use a single column.
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
      {renters.map((r) => (
        <RenterMiniCard
          key={r.id}
          renter={r}
          backTo={`/properties/${property.id}?tab=renters`}
          backLabel={property.address}
        />
      ))}
    </div>
  );
}
