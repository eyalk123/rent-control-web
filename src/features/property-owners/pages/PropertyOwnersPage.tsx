import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, UserRound, Building2 } from 'lucide-react';
import { usePropertyOwners } from '../queries';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { PropertyOwnerFormDrawer } from './PropertyOwnerFormDrawer';
import { PropertyOwnerDetailDrawer } from './PropertyOwnerDetailDrawer';
import type { PropertyOwner } from '@/shared/types';

function OwnerCard({ owner, onOpen }: { owner: PropertyOwner; onOpen: (owner: PropertyOwner) => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => onOpen(owner)}
      className="flex flex-col gap-3 p-4 rounded-[var(--radius-card)] text-start w-full transition-all hover:-translate-y-px"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
        opacity: owner.is_active ? 1 : 0.6,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
          <UserRound size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{owner.name}</p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {[t('propertyOwners.propertyCount', { count: owner.property_count }), owner.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
        {!owner.is_active && <Pill tone="neutral">{t('suppliers.inactive')}</Pill>}
      </div>

      {owner.bank_account && (
        <div className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-[11px] font-medium" style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
          <Building2 size={12} /> {owner.bank_account}
        </div>
      )}
    </button>
  );
}

/** The people who own the properties, with their contact and bank details. */
export function PropertyOwnersPage() {
  const { t } = useTranslation();
  // Every owner, inactive included: an owner still holds properties whether or not someone
  // marked them inactive, and hiding them would hide where those properties point.
  const { data: owners = [], isLoading } = usePropertyOwners({ includeInactive: true });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOwnerId, setEditOwnerId] = useState<number | undefined>();
  const [detailOwnerId, setDetailOwnerId] = useState<number | null>(null);
  // Read from the list rather than held as a copy, so an edit shows in the open drawer.
  const detailOwner = owners.find((o) => o.id === detailOwnerId) ?? null;

  const openAdd = () => { setEditOwnerId(undefined); setDrawerOpen(true); };
  const openEdit = (id: number) => { setEditOwnerId(id); setDrawerOpen(true); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 gap-y-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('tabs.propertyOwners')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('propertyOwners.headerMeta', { count: owners.length })}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex shrink-0 items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={14} /> {t('propertyOwners.add')}
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : owners.length === 0 ? (
        <EmptyState icon={undefined} title={t('propertyOwners.empty')} />
      ) : (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
          {owners.map((o) => <OwnerCard key={o.id} owner={o} onOpen={(owner) => setDetailOwnerId(owner.id)} />)}
        </div>
      )}

      <PropertyOwnerDetailDrawer
        open={detailOwner !== null}
        owner={detailOwner}
        onClose={() => setDetailOwnerId(null)}
        onEdit={(id) => { setDetailOwnerId(null); openEdit(id); }}
      />

      <PropertyOwnerFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ownerId={editOwnerId}
      />
    </div>
  );
}
