import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, CheckSquare } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, useDataTable } from '@/shared/components/ui/DataTable';
import { useViewMode, type ViewMode } from '@/hooks/useViewMode';
import { RenterFormDrawer } from './RenterFormDrawer';
import { useRenters, renterKeys } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { deleteRenter } from '../api/renters';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { SelectionToolbar } from '@/shared/components/ui/SelectionToolbar';
import { TriStateCheckbox } from '@/shared/components/ui/TriStateCheckbox';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useSelectMode } from '@/hooks/useSelectMode';
import { useLongPress } from '@/hooks/useLongPress';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { formatMoney } from '@/shared/utils/money';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';
import type { Renter } from '@/shared/types';

// ─── helpers ────────────────────────────────────────────────────────────────

import i18n from '@/core/i18n';

function fmtLeaseEnd(renter: Renter): string | null {
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

type RenterStatus = 'active' | 'expiring' | 'overdue';

// ─── card ────────────────────────────────────────────────────────────────────

interface RenterCardProps {
  renter: Renter;
  status: RenterStatus;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onLongPress: (id: number) => void;
}

function RenterCard({ renter, status, isSelectMode, isSelected, onToggle, onLongPress }: RenterCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const color = getPropertyColor(renter.id);
  const bg = getPropertyColorBg(renter.id);
  const monthly = getRenterMonthlyRent(renter);
  const leaseEnd = fmtLeaseEnd(renter);
  const pillTone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
  const pillLabel = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');
  const longPress = useLongPress(() => onLongPress(renter.id));

  const activate = () => {
    if (isSelectMode) onToggle(renter.id);
    else navigate(`/renters/${renter.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter') activate(); }}
      {...longPress}
      className="flex flex-col gap-2.5 rounded-[var(--radius-card)] p-3 cursor-pointer transition-all hover:-translate-y-px text-start"
      style={{ background: 'var(--color-surface)', border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`, boxShadow: isSelected ? '0 0 0 1px var(--color-primary)' : undefined }}
    >
      {/* Avatar + name + status pill */}
      <div className="flex items-center gap-3">
        {isSelectMode && <TriStateCheckbox checked={isSelected} />}
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: bg, color }}>
            {(renter.first_name[0] + renter.last_name[0]).toUpperCase()}
          </div>
          {/* status dot */}
          <span
            className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2"
            style={{
              background: status === 'overdue' ? 'var(--color-error)' : status === 'expiring' ? 'var(--color-warning)' : 'var(--color-success)',
              borderColor: 'var(--color-surface)',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {renter.first_name} {renter.last_name}
          </p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {renter.property ? `${renter.property.address}${formatFloorApartment(renter.property, t)}` : '—'}
          </p>
        </div>
        <Pill tone={pillTone}>{pillLabel}</Pill>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 pt-2.5" style={{ borderTop: '1px solid var(--color-outline)' }}>
        {[
          { label: t('property.rent'), value: <LtrSpan>{formatMoney(monthly)}</LtrSpan> },
          { label: t('renter.leaseEnds'), value: leaseEnd ?? '—' },
          { label: t('renter.payDay'), value: renter.payment_day_of_month ? t('renter.payDayShort', { day: renter.payment_day_of_month }) : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            <p className="text-[13.5px] font-bold mt-0.5" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Contact strip */}
      <div className="flex gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
        {[
          { icon: Mail, label: t('renter.email'), href: `mailto:${renter.email}` },
        ].map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex flex-1 h-7 items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium transition-colors hover:opacity-80"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
          >
            <Icon size={13} /> {label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── table ───────────────────────────────────────────────────────────────────

function useRenterColumns(
  statusMap: Map<number, RenterStatus>,
  ownerByProperty: Map<number, string>,
): ColumnDef<Renter, unknown>[] {
  const { t } = useTranslation();
  return useMemo<ColumnDef<Renter, unknown>[]>(() => {
    const ownerOf = (r: Renter) => ownerByProperty.get(r.property?.id ?? r.property_id ?? -1) ?? '';
    return [
    {
      id: 'renter',
      header: t('renter.colRenter'),
      accessorFn: (r) => `${r.first_name} ${r.last_name} ${r.email}`,
      filterFn: 'includesString',
      meta: { filter: 'text', filterPlaceholder: t('renter.colRenter') },
      cell: ({ row }) => {
        const r = row.original;
        const color = getPropertyColor(r.id);
        const bg = getPropertyColorBg(r.id);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: bg, color }}>
              {(r.first_name[0] + r.last_name[0]).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{r.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'property',
      header: t('property.colProperty'),
      accessorFn: (r) => r.property?.address ?? '',
      filterFn: 'includesString',
      meta: { filter: 'text', filterPlaceholder: t('property.colProperty') },
      cell: ({ row }) => {
        const r = row.original;
        return (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {r.property ? `${r.property.address}${formatFloorApartment(r.property, t)}` : '—'}
          </span>
        );
      },
    },
    {
      id: 'owner',
      header: t('property.colOwner'),
      accessorFn: (r) => ownerOf(r),
      filterFn: 'includesString',
      meta: { filter: 'text', filterPlaceholder: t('property.colOwner') },
      cell: ({ row }) => {
        const owner = ownerOf(row.original);
        return <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{owner || '—'}</span>;
      },
    },
    {
      id: 'phone',
      header: t('renter.colPhone'),
      accessorFn: (r) => r.phone,
      filterFn: 'includesString',
      meta: { filter: 'text', filterPlaceholder: t('renter.colPhone') },
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{row.original.phone}</span>
      ),
    },
    {
      id: 'rent',
      header: t('property.rent'),
      accessorFn: (r) => getRenterMonthlyRent(r),
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          <LtrSpan style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(getRenterMonthlyRent(row.original))}</LtrSpan>
        </span>
      ),
    },
    {
      id: 'leaseEnds',
      header: t('renter.leaseEnds'),
      accessorFn: (r) => getLeaseEndDate(r)?.getTime() ?? 0,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{fmtLeaseEnd(row.original) ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: t('property.colStatus'),
      accessorFn: (r) => statusMap.get(r.id) ?? 'active',
      enableColumnFilter: false, // status already filtered via the tab bar
      cell: ({ row }) => {
        const status = statusMap.get(row.original.id) ?? 'active';
        const tone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
        const label = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');
        return <Pill tone={tone}>{label}</Pill>;
      },
    },
    ];
  }, [t, statusMap, ownerByProperty]);
}

// ─── main page ───────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'expiring' | 'overdue';

export function RentersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: renters = [], isLoading, error, refetch } = useRenters();
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useViewMode('renters');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Tables overflow on phones — force the card view below the desktop breakpoint.
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the ?new query param once
  }, []);

  // Build status map (memoized so the table's columns stay stable across renders)
  const statusMap = useMemo(() => {
    const overdueIds = new Set((overdueList as OverdueRenter[]).map((r) => r.renter_id));
    const expiringIds = new Set((expiringList as ExpiringRenter[]).map((r) => r.renter_id));
    return new Map<number, RenterStatus>(
      renters.map((r) => [r.id, overdueIds.has(r.id) ? 'overdue' : expiringIds.has(r.id) ? 'expiring' : 'active'])
    );
  }, [renters, overdueList, expiringList]);

  const counts = {
    all: renters.length,
    active: renters.filter((r) => statusMap.get(r.id) === 'active').length,
    expiring: renters.filter((r) => statusMap.get(r.id) === 'expiring').length,
    overdue: renters.filter((r) => statusMap.get(r.id) === 'overdue').length,
  };

  // Memoized so the `data` reference passed to useReactTable is stable across renders;
  // an always-new array sends TanStack into an infinite re-render loop that freezes the tab.
  const filtered = useMemo(
    () => renters.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${r.first_name} ${r.last_name} ${r.phone} ${r.email}`.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && statusMap.get(r.id) !== statusFilter) return false;
      return true;
    }),
    [renters, search, statusFilter, statusMap],
  );

  // Owner lives on the full Property (not the nested PropertyBrief), so join against
  // the properties list by id. Memoized to keep the table columns referentially stable.
  const { data: properties = [] } = useProperties();
  const ownerByProperty = useMemo(
    () => new Map<number, string>(properties.map((p) => [p.id, p.property_owner ?? ''])),
    [properties],
  );

  const columns = useRenterColumns(statusMap, ownerByProperty);
  const { table } = useDataTable(columns, filtered);
  // Rows currently visible after column filters + sort — selection acts on these.
  const visibleRows = table.getRowModel().rows.map((r) => r.original);

  const qc = useQueryClient();
  const sel = useSelectMode({
    items: visibleRows,
    deleteItem: deleteRenter,
    onDeleted: () => qc.invalidateQueries({ queryKey: renterKeys.all }),
  });

  if (error) return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <EmptyState icon={undefined} title={t('error.loadFailed')} action={
        <button onClick={() => refetch()} className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>{t('common.retry')}</button>
      } />
    </div>
  );

  const STATUS_TABS: { key: StatusFilter; label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }[] = [
    { key: 'all',      label: t('renter.statusAll'), tone: 'neutral' },
    { key: 'active',   label: t('renter.active'),    tone: 'success' },
    { key: 'expiring', label: t('renter.expiring'),  tone: 'warning' },
    { key: 'overdue',  label: t('renter.overdue'),   tone: 'danger'  },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.renters')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {isLoading
              ? <Skeleton width={200} height={14} />
              : t('renter.headerMeta', { count: renters.length, expiring: counts.expiring, overdue: counts.overdue })}
          </p>
        </div>
        {sel.isSelectMode ? (
          <div className="flex-1 min-w-[260px]">
            <SelectionToolbar
              allSelected={sel.allSelected}
              someSelected={sel.someSelected}
              selectedCount={sel.selectedCount}
              deleting={sel.deleting}
              onToggleAll={sel.toggleAll}
              onDelete={sel.requestDelete}
              onCancel={sel.cancel}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => sel.enter()}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <CheckSquare size={14} /> {t('common.select')}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> {t('property.addRenterAction')}
            </button>
          </div>
        )}
      </div>

      {/* Status tabs + search + view toggle */}
      <div className="flex flex-wrap items-center gap-0 gap-y-2 pt-1" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        {STATUS_TABS.map(({ key, label, tone }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className="inline-flex items-center gap-1.5 px-1 py-2.5 me-4 text-[13px] transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: statusFilter === key ? '2px solid var(--color-brand-navy)' : '2px solid transparent',
              color: statusFilter === key ? 'var(--color-brand-navy)' : 'var(--color-text-secondary)',
              fontWeight: statusFilter === key ? 700 : 500,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {label}
            <Pill tone={statusFilter === key ? tone : 'neutral'} size="sm">{isLoading ? <Skeleton width={8} height={10} /> : counts[key]}</Pill>
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pb-2 w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('renter.searchPlaceholder')}
            className="h-9 rounded-[9px] px-3 text-sm flex-1 min-w-0 sm:flex-none sm:w-[240px] outline-none"
            style={{
              background: 'var(--color-input-filled-background)',
              border: '1px solid var(--color-outline)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="hidden lg:flex items-center gap-2">
            <SegToggle
              value={view}
              onChange={(v) => setView(v as ViewMode)}
              options={[
                { value: 'card', label: t('common.cardsView') },
                { value: 'table', label: t('common.tableView') },
              ]}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-5">
        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={undefined}
            title={search || statusFilter !== 'all' ? t('empty.noResults') : t('empty.renters')}
            action={
              !search && statusFilter === 'all' ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Plus size={14} /> {t('renter.addNew')}
                </button>
              ) : undefined
            }
          />
        ) : view === 'card' || isMobile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => (
              <RenterCard
                key={r.id}
                renter={r}
                status={statusMap.get(r.id) ?? 'active'}
                isSelectMode={sel.isSelectMode}
                isSelected={sel.selectedIds.has(r.id)}
                onToggle={sel.toggle}
                onLongPress={sel.enter}
              />
            ))}
          </div>
        ) : (
          <DataTable
            table={table}
            rowId={(r) => r.id}
            onRowClick={(r) => navigate(`/renters/${r.id}`)}
            isSelectMode={sel.isSelectMode}
            selectedIds={sel.selectedIds}
            allSelected={sel.allSelected}
            someSelected={sel.someSelected}
            onToggle={sel.toggle}
            onToggleAll={sel.toggleAll}
          />
        )}
      </div>

      <RenterFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ConfirmDialog
        open={sel.confirmOpen}
        title={t('bulkDelete.deleteConfirmTitle', { count: sel.selectedCount })}
        message={t('bulkDelete.deleteConfirmMessage')}
        loading={sel.deleting}
        onConfirm={sel.performDelete}
        onClose={() => sel.setConfirmOpen(false)}
      />
    </div>
  );
}
