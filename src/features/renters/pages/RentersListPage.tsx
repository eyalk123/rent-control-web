import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, CheckSquare } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, useDataTable } from '@/shared/components/ui/DataTable';
import { useViewMode, type ViewMode } from '@/hooks/useViewMode';
import { usePersistedState } from '@/hooks/usePersistedState';
import { RenterFormDrawer } from './RenterFormDrawer';
import { PropertyFormDrawer } from '@/features/properties/pages/PropertyFormDrawer';
import { useScanSession } from '@/features/document-scan/ScanContext';
import { AddMenu } from '@/shared/components/ui/AddMenu';
import { type PropertyMatchStatus } from '@/features/document-scan/utils/matchProperty';
import type { MappedExtraction, MappedRenter } from '@/features/document-scan/utils/mapExtraction';
import { useRenters, renterKeys } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { deleteRenter } from '../api/renters';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { getRenterLifecycle } from '@/shared/utils/renterStatus';
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
import { getLeaseUrgency } from '@/shared/utils/dates';
import { getCurrentMonthlyRent, getLeaseEndDate } from '@/shared/types';
import type { Renter } from '@/shared/types';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour, useTourStep } from '@/features/onboarding/TourController';

// ─── helpers ────────────────────────────────────────────────────────────────

import i18n from '@/core/i18n';

function fmtLeaseEnd(renter: Renter): string | null {
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

// Color for the "Lease ends" value: red when expired, amber when ending within 3 months.
function leaseUrgencyColor(renter: Renter): string | undefined {
  const urgency = getLeaseUrgency(getLeaseEndDate(renter));
  if (urgency === 'expired') return 'var(--color-error)';
  if (urgency === 'soon') return 'var(--color-warning)';
  return undefined;
}

/**
 * Display status for the list. `ended` comes from the lease lifecycle and wins over the
 * other three: a closed lease is neither overdue nor expiring, whatever the
 * overdue/expiring endpoints still hold.
 */
type RenterStatus = 'active' | 'expiring' | 'overdue' | 'ended';

const STATUS_TONE: Record<RenterStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  overdue: 'danger',
  ended: 'neutral',
};

function statusLabelKey(status: RenterStatus): string {
  return status === 'overdue'
    ? 'renter.overdue'
    : status === 'expiring'
      ? 'renter.expiring'
      : status === 'ended'
        ? 'renter.ended'
        : 'renter.active';
}

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
  const monthly = getCurrentMonthlyRent(renter);
  const leaseEnd = fmtLeaseEnd(renter);
  const pillTone = STATUS_TONE[status];
  const pillLabel = t(statusLabelKey(status));
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
              background: status === 'overdue' ? 'var(--color-error)' : status === 'expiring' ? 'var(--color-warning)' : status === 'ended' ? 'var(--color-text-secondary)' : 'var(--color-success)',
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
          { label: t('property.rent'), value: <LtrSpan>{formatMoney(monthly)}</LtrSpan>, color: undefined as string | undefined },
          { label: t('renter.leaseEnds'), value: leaseEnd ?? '—', color: leaseUrgencyColor(renter) },
          { label: t('renter.payDay'), value: renter.payment_day_of_month ? t('renter.payDayShort', { day: renter.payment_day_of_month }) : '—', color: undefined },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            <p className="text-[13.5px] font-bold mt-0.5" style={{ color: color ?? 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
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
    // DataTable applies the locale-aware ordering to every column filter.
    const ownerOptions = Array.from(
      new Set(Array.from(ownerByProperty.values()).map((o) => o.trim()).filter(Boolean)),
    );
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
      filterFn: 'equalsString',
      meta: {
        filter: 'select',
        filterPlaceholder: t('common.all'),
        filterOptions: ownerOptions.map((o) => ({ value: o, label: o })),
      },
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
      accessorFn: (r) => getCurrentMonthlyRent(r),
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          <LtrSpan style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(getCurrentMonthlyRent(row.original))}</LtrSpan>
        </span>
      ),
    },
    {
      id: 'leaseEnds',
      header: t('renter.leaseEnds'),
      // No lease-end sorts to the bottom under the default ascending order.
      accessorFn: (r) => getLeaseEndDate(r)?.getTime() ?? Number.POSITIVE_INFINITY,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-sm font-medium" style={{ color: leaseUrgencyColor(row.original) ?? 'var(--color-text-secondary)' }}>{fmtLeaseEnd(row.original) ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: t('property.colStatus'),
      accessorFn: (r) => statusMap.get(r.id) ?? 'active',
      enableColumnFilter: false, // status already filtered via the tab bar
      cell: ({ row }) => {
        const status = statusMap.get(row.original.id) ?? 'active';
        return <Pill tone={STATUS_TONE[status]}>{t(statusLabelKey(status))}</Pill>;
      },
    },
    ];
  }, [t, statusMap, ownerByProperty]);
}

// ─── main page ───────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'expiring' | 'overdue' | 'ended';

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'expiring', 'overdue', 'ended'];

export function RentersListPage() {
  // Gated on hasRenters — an empty list has neither cards to explain nor an Ended tab
  // worth pointing at.
  useTour('renters-list');
  const listAnchorRef = useTourAnchor(ANCHORS.rentersList);
  const endedAnchorRef = useTourAnchor(ANCHORS.rentersEndedFilter);
  const metaAnchorRef = useTourAnchor(ANCHORS.rentersHeaderMeta);
  const addAnchorRef = useTourAnchor(ANCHORS.rentersAddButton);
  const selectAnchorRef = useTourAnchor(ANCHORS.rentersSelect);
  const searchAnchorRef = useTourAnchor(ANCHORS.rentersSearch);
  const toggleAnchorRef = useTourAnchor(ANCHORS.rentersViewToggle);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: renters = [], isLoading, error, refetch } = useRenters();
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const [persistedStatus, setStatusFilter] = usePersistedState<StatusFilter>('app_list_status:renters', 'all');
  // The persisted value outlives the code that wrote it, so an unrecognised one (a tab
  // that was renamed or removed) falls back to 'all' rather than filtering everything out.
  const statusFilter = STATUS_FILTERS.includes(persistedStatus) ? persistedStatus : 'all';
  const [search, setSearch] = usePersistedState('app_list_search:renters', '');
  const [view, setView] = useViewMode('renters');
  // Both display modes are demonstrated rather than described — see the same block in
  // PropertiesListPage for why this is derived and never written.
  const tourStep = useTourStep('renters-list');
  const shownView: ViewMode =
    tourStep === 'cards' ? 'card' : tourStep === 'table' ? 'table' : view;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);
  // Which property the scan's property-review step edits: the matched property (review it
  // against the lease before its renters), or undefined for the "create property from lease"
  // pivot, which creates one.
  const [propertyDrawerId, setPropertyDrawerId] = useState<number | undefined>(undefined);
  // Document-scan (renter target) result: the mapped extraction, the finalised per-renter
  // queue (joint-rent split applied), and which existing property it matched. Populated from
  // the app-global scan session once the user continues out of the summary.
  const [scan, setScan] = useState<{
    logId: number;
    mapped: MappedExtraction;
    renters: MappedRenter[];
    file: File;
    matchedPropertyId: number | null;
    matchStatus: PropertyMatchStatus;
  } | null>(null);
  const openBlankRenterForm = () => { setScan(null); setDrawerOpen(true); };
  const location = useLocation();
  const { begin: beginScan, view: scanView, session: scanSession, consume: consumeScan } = useScanSession();
  // Tables overflow on phones — force the card view below the desktop breakpoint.
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setScan(null);
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
      // Lifecycle first: the overdue/expiring endpoints already exclude ended leases, but
      // a renter whose lease simply ran out is in neither list and would otherwise fall
      // through to 'active' — which is how an expired lease used to show a green pill.
      renters.map((r) => {
        if (getRenterLifecycle(r) === 'ended') return [r.id, 'ended'];
        return [r.id, overdueIds.has(r.id) ? 'overdue' : expiringIds.has(r.id) ? 'expiring' : 'active'];
      })
    );
  }, [renters, overdueList, expiringList]);

  // "All" means all *current* renters — ended leases live behind their own tab so the
  // list doesn't fill with past tenants as the years accumulate.
  const counts = {
    all: renters.filter((r) => statusMap.get(r.id) !== 'ended').length,
    active: renters.filter((r) => statusMap.get(r.id) === 'active').length,
    expiring: renters.filter((r) => statusMap.get(r.id) === 'expiring').length,
    overdue: renters.filter((r) => statusMap.get(r.id) === 'overdue').length,
    ended: renters.filter((r) => statusMap.get(r.id) === 'ended').length,
  };

  // Memoized so the `data` reference passed to useReactTable is stable across renders;
  // an always-new array sends TanStack into an infinite re-render loop that freezes the tab.
  const filtered = useMemo(
    () => renters.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${r.first_name} ${r.last_name} ${r.phone} ${r.email}`.toLowerCase().includes(q)) return false;
      }
      const status = statusMap.get(r.id) ?? 'active';
      // An active search looks across every renter including ended ones — "where did
      // Yossi go" must never depend on which tab happens to be open.
      if (search) return true;
      if (statusFilter === 'all') return status !== 'ended';
      return status === statusFilter;
    })
    // Default order: soonest lease end first; renters with no lease end sink to the bottom.
    .sort((a, b) => {
      const ta = getLeaseEndDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = getLeaseEndDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ta - tb;
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

  // Pick up the scan handoff and open the renter form pre-filled. The property to attach to
  // was chosen by the user on the summary drawer (auto-matched by default) and carried on the
  // result, so we honor it here instead of re-matching.
  useEffect(() => {
    if (scanView === 'handoff' && scanSession?.originPath === location.pathname) {
      const result = consumeScan();
      if (result) {
        setScan({
          logId: result.logId,
          mapped: result.mapped,
          renters: result.renters,
          file: result.file,
          matchedPropertyId: result.targetPropertyId,
          matchStatus: result.targetPropertyId != null ? 'matched' : 'none',
        });
        // The lease describes the property as well as its renters. When it attached to an
        // existing property, review that property against the lease first (blank fields
        // filled, differing ones raised as conflicts) and let it chain into the renters —
        // the same review step a property-target scan gets. With no property to attach to
        // there is nothing to review, so go straight to the renter form, which offers the
        // picker and the "create property from lease" pivot.
        if (result.targetPropertyId != null) {
          setPropertyDrawerId(result.targetPropertyId);
          setPropertyDrawerOpen(true);
        } else {
          setDrawerOpen(true);
        }
      }
    }
  }, [scanView, scanSession, location.pathname, consumeScan]);

  const columns = useRenterColumns(statusMap, ownerByProperty);
  // Default the table sort to the lease-end column (ascending); user clicks override it.
  const { table } = useDataTable(columns, filtered, [{ id: 'leaseEnds', desc: false }], 'renters');
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
    { key: 'ended',    label: t('renter.ended'),     tone: 'neutral' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-0">
      {/* Header */}
      {/* Stacked on mobile: side by side, the three-clause subtitle wrapped to three lines
          and ran underneath the Select / Add buttons. */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.renters')}</h1>
          <p ref={metaAnchorRef} className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {isLoading
              ? <Skeleton width={200} height={14} />
              : t('renter.headerMeta', { count: renters.length, expiring: counts.expiring, overdue: counts.overdue })}
          </p>
        </div>
        {sel.isSelectMode ? (
          <div className="flex-1 basis-full sm:basis-auto sm:min-w-[260px]">
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
              ref={selectAnchorRef}
              onClick={() => sel.enter()}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <CheckSquare size={14} /> {t('common.select')}
            </button>
            <AddMenu
              anchorRef={addAnchorRef}
              label={t('property.addRenterAction')}
              onManual={openBlankRenterForm}
              onScan={() => beginScan({ target: 'renter', originPath: location.pathname })}
            />
          </div>
        )}
      </div>

      {/* Status tabs + search + view toggle */}
      {/* Scrolls rather than wrapping: at 390px the fourth tab dropped to its own row. */}
      <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap items-center gap-0 gap-y-2 pt-1" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        {STATUS_TABS.map(({ key, label, tone }) => (
          <button
            key={key}
            // Only the Ended tab is anchored: it is the one the seed names, and where a
            // departed tenant's history actually lives.
            ref={key === 'ended' ? endedAnchorRef : undefined}
            onClick={() => setStatusFilter(key)}
            className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-1 py-2.5 me-4 text-[13px] transition-colors"
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
            ref={searchAnchorRef}
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
          {/* Hidden below `lg`, and so is the table — which is what lets the tour's table
              step drop itself at the width where it could not be demonstrated. */}
          <div className="hidden lg:flex items-center gap-2">
            <SegToggle
              anchorRef={toggleAnchorRef}
              value={shownView}
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
      <div ref={listAnchorRef} className="pt-5">
        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={undefined}
            title={search || statusFilter !== 'all' ? t('empty.noResults') : t('empty.renters')}
            action={
              !search && statusFilter === 'all' ? (
                <button
                  onClick={openBlankRenterForm}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Plus size={14} /> {t('renter.addNew')}
                </button>
              ) : undefined
            }
          />
        ) : shownView === 'card' || isMobile ? (
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

      <RenterFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logId={scan?.logId}
        renterQueue={scan?.renters}
        pendingContractFile={scan?.file ?? null}
        initialPropertyId={scan?.matchedPropertyId ?? undefined}
        matchStatus={scan?.matchStatus}
        scannedLeaseAddress={scan ? { address: scan.mapped.propertyPrefill.address, city: scan.mapped.propertyPrefill.city, floor: scan.mapped.propertyPrefill.floor, apartment: scan.mapped.propertyPrefill.apartment } : undefined}
        onCreatePropertyFromScan={
          scan ? () => { setDrawerOpen(false); setPropertyDrawerId(undefined); setPropertyDrawerOpen(true); } : undefined
        }
      />
      {/* The scan's property step: reviewing the matched property against the lease, or the
          "create property from lease" pivot. Either way it chains on into the renter queue. */}
      <PropertyFormDrawer
        open={propertyDrawerOpen}
        onClose={() => setPropertyDrawerOpen(false)}
        propertyId={propertyDrawerId}
        logId={scan?.logId}
        prefill={scan?.mapped.propertyPrefill}
        reviewItems={scan?.mapped.propertyReview}
        provenance={scan?.mapped.propertyProvenance}
        addressEvidence={scan?.mapped.addressEvidence}
        renterQueue={scan?.renters}
        renterContractFile={scan?.file ?? null}
      />
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
