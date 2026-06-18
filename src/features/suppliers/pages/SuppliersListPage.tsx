import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { Plus, Store, Building2 } from 'lucide-react';
import { useSuppliers } from '../queries';
import { useExpenseCategories } from '@/features/transactions/queries';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { FormSelect, type SelectOption } from '@/shared/components/form/FormSelect';
import { SupplierFormDrawer } from './SupplierFormDrawer';
import { SupplierDetailDrawer } from './SupplierDetailDrawer';
import type { Supplier } from '@/shared/types';

function bankString(account: string | null | undefined): string | null {
  if (!account) return null;
  return account; // stored as "code/branch/account"
}

function SupplierCard({ supplier, catMap, onOpen }: { supplier: Supplier; catMap: Map<number, string>; onOpen: (supplier: Supplier) => void }) {
  const { t } = useTranslation();
  const bank = bankString(supplier.bank_account);

  return (
    <button
      onClick={() => onOpen(supplier)}
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
        {!supplier.is_active && <Pill tone="neutral">{t('suppliers.inactive')}</Pill>}
      </div>

      {supplier.category_ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {supplier.category_ids.map((cid) => (
            <Pill key={cid} tone="info">{catMap.get(cid) ?? String(cid)}</Pill>
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
  const [showInactive, setShowInactive] = useState(false);
  const [nameFilter, setNameFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<number | undefined>();
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const openEdit = (id: number) => { setEditSupplierId(id); setDrawerOpen(true); };
  const openAdd = () => { setEditSupplierId(undefined); setDrawerOpen(true); };

  const { data: suppliers = [], isLoading } = useSuppliers({ includeInactive: showInactive });
  const { data: categories = [] } = useExpenseCategories();

  const catMap = useMemo(
    () => new Map<number, string>(categories.map((c) => [c.id, c.name ?? (c.key ? translateCategory(c.key, t) : String(c.id))])),
    [categories, t],
  );
  const activeCount = (suppliers as Supplier[]).filter((s) => s.is_active).length;

  const nameOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('filters.all') },
      ...(suppliers as Supplier[]).map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suppliers, t],
  );

  const categoryOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<number>();
    const opts: SelectOption[] = [{ value: 'all', label: t('filters.all') }];
    for (const s of suppliers as Supplier[]) {
      for (const cid of s.category_ids) {
        if (seen.has(cid) || !catMap.has(cid)) continue;
        seen.add(cid);
        opts.push({ value: String(cid), label: catMap.get(cid)! });
      }
    }
    return opts;
  }, [suppliers, catMap, t]);

  const filtered = useMemo(
    () => (suppliers as Supplier[]).filter((s) => {
      if (nameFilter !== 'all' && String(s.id) !== nameFilter) return false;
      if (categoryFilter !== 'all' && !s.category_ids.includes(Number(categoryFilter))) return false;
      return true;
    }),
    [suppliers, nameFilter, categoryFilter],
  );

  const isFiltered = nameFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 gap-y-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.suppliers')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('suppliers.headerMeta', { count: suppliers.length, active: activeCount })}
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
            {showInactive ? t('suppliers.hideInactive') : t('suppliers.showInactive')}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('suppliers.add')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[240px]">
          <FormSelect
            label={t('filters.name')}
            value={nameFilter}
            onValueChange={setNameFilter}
            options={nameOptions}
          />
        </div>
        <div className="w-full max-w-[240px]">
          <FormSelect
            label={t('filters.category')}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={categoryOptions}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={undefined}
          title={isFiltered || suppliers.length > 0 ? t('empty.noResults') : t('empty.suppliers')}
          action={
            !isFiltered && suppliers.length === 0 ? (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {t('suppliers.addNew')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
          {filtered.map((s) => <SupplierCard key={s.id} supplier={s} catMap={catMap} onOpen={setDetailSupplier} />)}
        </div>
      )}

      <SupplierDetailDrawer
        open={detailSupplier !== null}
        supplier={detailSupplier}
        catMap={catMap}
        onClose={() => setDetailSupplier(null)}
        onEdit={(id) => { setDetailSupplier(null); openEdit(id); }}
      />

      <SupplierFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        supplierId={editSupplierId}
      />
    </div>
  );
}
