import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Trash2 } from 'lucide-react';
import { useRenters, useDeleteRenter } from '../queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';
import { getLeaseEndDate } from '@/shared/types';
import type { Renter } from '@/shared/types';

function RenterCard({
  renter, selected, selectionMode, onSelect, onOpen,
}: {
  renter: Renter; selected: boolean; selectionMode: boolean;
  onSelect: () => void; onOpen: () => void;
}) {
  const { t } = useTranslation();
  const end = getLeaseEndDate(renter);
  const isExpiring = end && (end.getTime() - Date.now()) < 60 * 24 * 60 * 60 * 1000;
  return (
    <div
      onClick={selectionMode ? onSelect : onOpen}
      className={`flex items-start gap-3 rounded-2xl bg-[var(--color-surface)] border cursor-pointer p-4 transition-colors hover:border-[var(--color-primary)]/40 ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-outline)]'}`}
    >
      {selectionMode && (
        <input type="checkbox" checked={selected} onChange={onSelect} onClick={(e) => e.stopPropagation()} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]" />
      )}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] text-[var(--color-avatar-text)] text-sm font-semibold border border-[var(--color-avatar-border)]">
        {renter.first_name[0]}{renter.last_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[var(--color-text-primary)]">{renter.first_name} {renter.last_name}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{renter.phone}</p>
        {renter.property && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{renter.property.address}</p>}
        {isExpiring && <p className="text-xs text-[var(--color-warning)] mt-1">{t('home.leaseExpiringSoon')}</p>}
      </div>
    </div>
  );
}

export function RentersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: renters, isLoading, error, refetch } = useRenters();
  const { mutateAsync: deleteRenter } = useDeleteRenter();
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const selectionMode = selectedIds.size > 0;

  const filtered = (renters ?? []).filter((r) =>
    `${r.first_name} ${r.last_name} ${r.phone} ${r.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkDelete = async () => {
    if (!confirm(t('bulkDelete.confirm', { count: selectedIds.size }))) return;
    try {
      await Promise.all([...selectedIds].map((id) => deleteRenter(id)));
      setSelectedIds(new Set());
      showToast(t('bulkDelete.success'), 'success');
    } catch { showToast(t('error.deleteFailed'), 'error'); }
  };

  if (error) return <PageContainer><EmptyState icon={Users} title={t('error.loadFailed')} action={<button onClick={() => refetch()} className="text-sm text-[var(--color-primary)] hover:underline">{t('common.retry')}</button>} /></PageContainer>;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('screens.renters')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{filtered.length} {t('renter.total', { count: filtered.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button onClick={() => setSelectedIds(new Set())} className="rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]">{t('common.cancel')}</button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-error)]/10 px-3 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/20"><Trash2 size={14} />{t('bulkDelete.delete', { count: selectedIds.size })}</button>
            </>
          ) : (
            <button onClick={() => navigate('/renters/add')} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus size={16} />{t('renter.addNew')}</button>
          )}
        </div>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search.rentersPlaceholder')} className="mb-5 w-full rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-primary)]" />
      {isLoading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title={search ? t('empty.noResults') : t('empty.renters')} action={!search ? <button onClick={() => navigate('/renters/add')} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus size={14} />{t('renter.addNew')}</button> : undefined} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => <RenterCard key={r.id} renter={r} selected={selectedIds.has(r.id)} selectionMode={selectionMode} onSelect={() => toggleSelect(r.id)} onOpen={() => navigate(`/renters/${r.id}`)} />)}
        </div>
      )}
    </PageContainer>
  );
}
