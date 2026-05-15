import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Store, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSuppliers } from '../queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';

export function SuppliersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: suppliers = [], isLoading } = useSuppliers({ q: search || undefined, includeInactive });

  return (
    <PageContainer>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('screens.suppliers')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeInactive((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]"
          >
            {includeInactive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {t('suppliers.inactive', 'Inactive')}
          </button>
          <button
            onClick={() => navigate('/suppliers/add')}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} />{t('suppliers.addNew', 'Add Supplier')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('suppliers.search', 'Search suppliers...')}
          className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-input-bg)] py-2 ps-9 pe-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {isLoading ? <PageLoader /> : suppliers.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t('empty.suppliers', 'No suppliers found')}
          action={
            <button onClick={() => navigate('/suppliers/add')} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus size={14} />{t('suppliers.addNew', 'Add Supplier')}
            </button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
          {suppliers.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/suppliers/${s.id}/edit`)}
              className="w-full flex items-center gap-3 p-4 text-start hover:bg-[var(--color-input-bg)] transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <Store size={16} className="text-[var(--color-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${s.is_active === false ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                  {s.name}
                </p>
                {s.phone && <p className="text-xs text-[var(--color-text-secondary)] truncate">{s.phone}</p>}
              </div>
              {s.is_active === false && (
                <span className="shrink-0 rounded-full bg-[var(--color-outline)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                  {t('suppliers.inactive', 'Inactive')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
