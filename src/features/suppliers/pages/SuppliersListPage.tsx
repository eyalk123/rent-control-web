import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Store, Building2 } from 'lucide-react';
import { useSuppliers } from '../queries';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import type { Supplier } from '@/shared/types';

function bankString(account: string | null | undefined): string | null {
  if (!account) return null;
  return account; // stored as "code/branch/account"
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const navigate = useNavigate();
  const bank = bankString(supplier.bank_account);

  return (
    <button
      onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
      className="flex flex-col gap-3 p-4 rounded-[var(--radius-card)] text-start w-full transition-all hover:-translate-y-px"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
        opacity: supplier.is_active ? 1 : 0.6,
      }}
    >
      {/* Name + icon row */}
      <div className="flex items-center gap-3">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
          <Store size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{supplier.name}</p>
          {supplier.phone && <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{supplier.phone}</p>}
        </div>
        {!supplier.is_active && <Pill tone="neutral">Inactive</Pill>}
      </div>

      {/* Category pills (show placeholder if no category names — category_ids only) */}
      {supplier.category_ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {supplier.category_ids.map((cid) => (
            <Pill key={cid} tone="info">Cat {cid}</Pill>
          ))}
        </div>
      )}

      {/* Bank account */}
      {bank && (
        <div className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-[11px] font-medium" style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
          <Building2 size={12} /> {bank}
        </div>
      )}
    </button>
  );
}

export function SuppliersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: suppliers = [], isLoading } = useSuppliers({ q: search || undefined, includeInactive: showInactive });

  const activeCount = (suppliers as Supplier[]).filter((s) => s.is_active).length;

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.suppliers')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {suppliers.length} total · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
            style={{
              border: '1px solid var(--color-outline)',
              color: showInactive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: showInactive ? 'var(--color-primary-container)' : 'var(--color-surface)',
            }}
          >
            {showInactive ? 'Hiding inactive' : 'Show inactive'}
          </button>
          <button
            onClick={() => navigate('/suppliers/add')}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> Add supplier
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search suppliers…"
        className="h-9 rounded-[9px] px-3 text-sm w-full max-w-[400px] outline-none"
        style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
      />

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={undefined}
          title={search ? t('empty.noResults') : t('empty.suppliers', 'No suppliers found')}
          action={
            !search ? (
              <button
                onClick={() => navigate('/suppliers/add')}
                className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {t('suppliers.addNew', 'Add Supplier')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
          {(suppliers as Supplier[]).map((s) => <SupplierCard key={s.id} supplier={s} />)}
        </div>
      )}
    </div>
  );
}
