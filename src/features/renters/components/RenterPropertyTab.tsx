import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { RenterPropertyCard } from './RenterPropertyCard';
import { useUpdateRenter } from '../queries';
import { useProperty, useProperties } from '@/features/properties/queries';
import { getRenterMonthlyRent } from '@/shared/types';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
}

export function RenterPropertyTab({ renter }: Props) {
  const { t } = useTranslation();
  const [linking, setLinking] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const p = renter.property;
  const { data: fullProp } = useProperty(p?.id ?? 0, { enabled: !!p?.id });
  const { data: allProperties } = useProperties();
  const updateRenter = useUpdateRenter(renter.id);

  if (!p) {
    if (linking) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-sm rounded-[var(--radius-card)] p-6 flex flex-col gap-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('renter.linkProperty')}</p>
            <FormSelect
              value={selectedId}
              onValueChange={setSelectedId}
              options={(allProperties ?? []).map((prop) => ({ value: String(prop.id), label: `${prop.address}${formatFloorApartment(prop, t)}, ${prop.city}` }))}
              placeholder={t('renter.selectProperty')}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setLinking(false); setSelectedId(''); }}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-medium"
                style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-outline)', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={!selectedId || updateRenter.isPending}
                onClick={() => updateRenter.mutate({ property_id: Number(selectedId) }, { onSuccess: () => { setLinking(false); setSelectedId(''); } })}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-medium"
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: selectedId ? 'pointer' : 'not-allowed', opacity: selectedId ? 1 : 0.5 }}
              >
                {updateRenter.isPending ? '…' : t('renter.link')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <EmptyState
        icon={Building2}
        title={t('renter.noPropertyLinked')}
        description={t('renter.noPropertyLinkedDesc')}
        action={
          <button
            onClick={() => setLinking(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-medium"
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {t('renter.linkProperty')}
          </button>
        }
      />
    );
  }

  const properties = fullProp ? [fullProp] : [];
  const monthlyRent = getRenterMonthlyRent(renter);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {properties.map((prop) => (
        <RenterPropertyCard key={prop.id} property={prop} monthlyRent={monthlyRent} />
      ))}
    </div>
  );
}
