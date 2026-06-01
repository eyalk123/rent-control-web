import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { RenterMiniCard } from './RenterMiniCard';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  onAddRenter: () => void;
}

export function PropertyRentersTab({ property, onAddRenter }: Props) {
  const { t } = useTranslation();
  const renters = property.renters ?? [];

  if (renters.length === 0) {
    return (
      <EmptyState
        icon={undefined}
        title={t('property.noRentersYet')}
        description={t('property.noRentersDesc')}
        action={
          <button
            onClick={onAddRenter}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('property.addRenterAction')}
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
      {renters.map((r) => <RenterMiniCard key={r.id} renter={r} />)}
    </div>
  );
}
