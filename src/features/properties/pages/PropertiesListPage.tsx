import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { useProperties, useDeleteProperty } from '../queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';
import type { Property } from '@/shared/types';

function PropertyCard({
  property,
  selected,
  onSelect,
  onOpen,
  selectionMode,
}: {
  property: Property;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  selectionMode: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      onClick={selectionMode ? onSelect : onOpen}
      className={`flex items-start gap-4 rounded-2xl bg-[var(--color-surface)] border cursor-pointer p-4 transition-colors hover:border-[var(--color-primary)]/40 ${
        selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-outline)]'
      }`}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
        />
      )}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
        <Building2 size={18} className="text-[var(--color-primary)]" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{property.address}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{property.city}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          {t(`property.type_${property.type}` as never, property.type)} · {property.sq_ft} m²
        </p>
        {property.renters && property.renters.length > 0 && (
          <p className="text-xs text-[var(--color-success)] mt-1">
            {property.renters.length} {t('property.rentersCount', { count: property.renters.length })}
          </p>
        )}
      </div>
    </div>
  );
}

export function PropertiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: properties, isLoading, error, refetch } = useProperties();
  const { mutateAsync: deleteProperty } = useDeleteProperty();
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const selectionMode = selectedIds.size > 0;

  const filtered = (properties ?? []).filter((p) =>
    `${p.address} ${p.city} ${p.property_owner ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(t('bulkDelete.confirm', { count: selectedIds.size }))) return;
    try {
      await Promise.all([...selectedIds].map((id) => deleteProperty(id)));
      setSelectedIds(new Set());
      showToast(t('bulkDelete.success'), 'success');
    } catch {
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  if (error) return (
    <PageContainer>
      <EmptyState icon={Building2} title={t('error.loadFailed')} action={
        <button onClick={() => refetch()} className="text-sm text-[var(--color-primary)] hover:underline">{t('common.retry')}</button>
      } />
    </PageContainer>
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('screens.properties')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{filtered.length} {t('property.total', { count: filtered.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-error)]/10 px-3 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/20"
              >
                <Trash2 size={14} />
                {t('bulkDelete.delete', { count: selectedIds.size })}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/properties/add')}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus size={16} />
              {t('property.addNew')}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('search.propertiesPlaceholder')}
        className="mb-5 w-full rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-primary)]"
      />

      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? t('empty.noResults') : t('empty.properties')}
          description={search ? undefined : t('empty.propertiesDesc')}
          action={
            !search ? (
              <button
                onClick={() => navigate('/properties/add')}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Plus size={14} />
                {t('property.addNew')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              selected={selectedIds.has(p.id)}
              selectionMode={selectionMode}
              onSelect={() => toggleSelect(p.id)}
              onOpen={() => navigate(`/properties/${p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Long-press hint */}
      {!selectionMode && filtered.length > 0 && (
        <p className="mt-4 text-center text-xs text-[var(--color-text-secondary)] opacity-60">
          {t('bulkDelete.hint')}
        </p>
      )}
    </PageContainer>
  );
}
