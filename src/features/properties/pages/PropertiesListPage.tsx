import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, AlertCircle, CheckSquare } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, useDataTable } from '@/shared/components/ui/DataTable';
import { useViewMode, type ViewMode } from '@/hooks/useViewMode';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useProperties, propertyKeys } from '../queries';
import { deleteProperty } from '../api/properties';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { useScanSession } from '@/features/document-scan/ScanContext';
import type { MappedExtraction, MappedRenter } from '@/features/document-scan/utils/mapExtraction';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { AddMenu } from '@/shared/components/ui/AddMenu';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { SelectionToolbar } from '@/shared/components/ui/SelectionToolbar';
import { TriStateCheckbox } from '@/shared/components/ui/TriStateCheckbox';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useSelectMode } from '@/hooks/useSelectMode';
import { useLongPress } from '@/hooks/useLongPress';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getPropertyImageSrc } from '../utils/propertyImageSrc';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { formatMoney } from '@/shared/utils/money';
import { getTotalCurrentMonthlyRent, getLeaseEndDate } from '@/shared/types';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Property, PropertyType } from '@/shared/types';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';

import i18n from '@/core/i18n';

const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'commercial', 'garden_apartment'];
import type { Renter } from '@/shared/types';

function fmtLeaseDate(renter: Renter | undefined): string | null {
  if (!renter) return null;
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function StatusPill({ hasRenters }: { hasRenters: boolean }) {
  const { t } = useTranslation();
  return hasRenters
    ? <Pill tone="success">{t('property.occupancy.occupied')}</Pill>
    : <Pill tone="warning">{t('property.occupancy.vacant')}</Pill>;
}

interface PropertyCardProps {
  property: Property;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onLongPress: (id: number) => void;
}

function PropertyCard({ property, isSelectMode, isSelected, onToggle, onLongPress }: PropertyCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const color = getPropertyColor(property.id);
  const bg = getPropertyColorBg(property.id, 0.35);
  const imageSrc = getPropertyImageSrc(property.image_url);
  const activeRenter = property.renters?.[0];
  const monthlyRent = property.renters?.length ? getTotalCurrentMonthlyRent(property.renters) : null;
  const leaseEnd = fmtLeaseDate(activeRenter);
  const longPress = useLongPress(() => onLongPress(property.id));

  const activate = () => {
    if (isSelectMode) onToggle(property.id);
    else navigate(`/properties/${property.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter') activate(); }}
      {...longPress}
      className="relative rounded-[var(--radius-card)] overflow-hidden cursor-pointer transition-all hover:-translate-y-px text-start"
      style={{ background: 'var(--color-surface)', border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`, boxShadow: isSelected ? '0 0 0 1px var(--color-primary)' : undefined }}
    >
      {/* Image */}
      {/* A 4:3 hero is ~290px tall in a full-width mobile column, so barely one card fit
          per screen. Below `lg` use a shallower ratio to roughly double list density. */}
      <div
        className="relative w-full aspect-[16/9] lg:aspect-[4/3]"
        style={{ background: imageSrc ? 'var(--color-input-filled-background)' : bg }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-contain p-3" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" fill="rgba(255,255,255,0.55)" />
              <path d="M3 11l9-8 9 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </svg>
          </div>
        )}
        {isSelectMode && (
          <div className="absolute top-2.5 end-3 rounded-[6px] p-0.5" style={{ background: 'var(--color-surface)' }}>
            <TriStateCheckbox checked={isSelected} />
          </div>
        )}
        <div className="absolute top-2.5 start-3 flex gap-1.5">
          <StatusPill hasRenters={!!property.hasRenters} />
          <Pill tone="neutral">{t(`property.type_${property.type}` as never, property.type)}</Pill>
        </div>
      </div>

      <div className="p-3">
        <p className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {property.address}
          <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(property, t)}</span>
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <MapPin size={10} />
          {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
          {property.property_owner && <> · {property.property_owner}</>}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--color-outline)' }}>
          {[
            { label: t('property.rent'), value: monthlyRent ? formatMoney(monthlyRent) : '—' },
            { label: t('property.renters'), value: property.renters?.length ?? 0 },
            { label: t('property.size'), value: `${property.sq_ft}m²` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
              <LtrSpan className="text-[13px] font-bold mt-0.5 block" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {String(value)}
              </LtrSpan>
            </div>
          ))}
        </div>

        {/* Renter / vacant strip */}
        <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--color-outline)' }}>
          {activeRenter ? (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold shrink-0" style={{ background: getPropertyColorBg(activeRenter.id), color: getPropertyColor(activeRenter.id) }}>
                {(activeRenter.first_name[0] + activeRenter.last_name[0]).toUpperCase()}
              </div>
              <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {activeRenter.first_name} {activeRenter.last_name}
              </span>
              {leaseEnd && (
                <span className="text-[11px] shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('property.endsDate', { date: leaseEnd })}
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-warning)' }}>
              <AlertCircle size={12} /> {t('property.available')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function usePropertyColumns(ownerOptions: string[]): ColumnDef<Property, unknown>[] {
  const { t } = useTranslation();
  return useMemo<ColumnDef<Property, unknown>[]>(() => [
    {
      id: 'property',
      header: t('property.colProperty'),
      accessorFn: (p) => `${p.address} ${p.city}`,
      filterFn: 'includesString',
      meta: { filter: 'text', filterPlaceholder: t('property.colProperty') },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {p.address}
              <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(p, t)}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{p.city}</p>
          </div>
        );
      },
    },
    {
      id: 'type',
      header: t('property.colType'),
      accessorFn: (p) => p.type,
      filterFn: 'equalsString',
      meta: {
        filter: 'select',
        filterPlaceholder: t('common.all'),
        filterOptions: PROPERTY_TYPES.map((ty) => ({ value: ty, label: t(`property.type_${ty}` as never, ty) })),
      },
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t(`property.type_${row.original.type}` as never, row.original.type)}
        </span>
      ),
    },
    {
      id: 'owner',
      header: t('property.colOwner'),
      accessorFn: (p) => p.property_owner ?? '',
      filterFn: 'equalsString',
      meta: {
        filter: 'select',
        filterPlaceholder: t('common.all'),
        filterOptions: ownerOptions.map((o) => ({ value: o, label: o })),
      },
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{row.original.property_owner ?? '—'}</span>
      ),
    },
    {
      id: 'renters',
      header: t('property.renters'),
      accessorFn: (p) => p.renters?.length ?? 0,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{row.original.renters?.length ?? 0}</span>
      ),
    },
    {
      id: 'rent',
      header: t('property.rent'),
      accessorFn: (p) => getTotalCurrentMonthlyRent(p.renters),
      enableColumnFilter: false,
      cell: ({ row }) => {
        const rent = getTotalCurrentMonthlyRent(row.original.renters);
        return (
          <span className="text-sm font-medium">
            <LtrSpan style={{ color: 'var(--color-text-primary)' }}>{rent > 0 ? formatMoney(rent) : '—'}</LtrSpan>
          </span>
        );
      },
    },
    {
      id: 'status',
      header: t('property.colStatus'),
      accessorFn: (p) => (p.hasRenters ? 'occupied' : 'vacant'),
      filterFn: 'equalsString',
      meta: {
        filter: 'select',
        filterPlaceholder: t('common.all'),
        filterOptions: [
          { value: 'occupied', label: t('property.occupancy.occupied') },
          { value: 'vacant', label: t('property.occupancy.vacant') },
        ],
      },
      cell: ({ row }) => <StatusPill hasRenters={!!row.original.hasRenters} />,
    },
  ], [t, ownerOptions]);
}

export function PropertiesListPage() {
  // Gated on hasProperties: both steps point at the card list, so an empty page has
  // nothing to spotlight and the tour simply defers.
  useTour('properties-list');
  const listAnchorRef = useTourAnchor(ANCHORS.propertiesList);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: properties, isLoading, error, refetch } = useProperties();
  const [search, setSearch] = usePersistedState('app_list_search:properties', '');
  const [view, setView] = useViewMode('properties');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Document-scan result driving the (persistent) property form's prefill. Kept until the
  // next blank "Add property" — NOT cleared on the drawer's onClose, so the chained renter
  // form keeps its prefill when the property drawer hides on "Add renter". `renters` is the
  // finalised per-renter queue (joint-rent split applied on the summary screen). Populated
  // from the app-global scan session once the user continues out of the summary.
  const [scan, setScan] = useState<{ logId: number; mapped: MappedExtraction; renters: MappedRenter[]; file: File; editPropertyId?: number } | null>(null);
  const openBlankPropertyForm = () => { setScan(null); setDrawerOpen(true); };
  const location = useLocation();
  const { begin: beginScan, view: scanView, session: scanSession, consume: consumeScan } = useScanSession();

  // Pick up the scan handoff: when the user continues out of the (global) summary drawer, open
  // the property form to review it — in edit mode (`editPropertyId`) when the lease matched an
  // existing property, or create mode otherwise. Either way it chains into the renter queue.
  useEffect(() => {
    if (scanView === 'handoff' && scanSession?.originPath === location.pathname) {
      const result = consumeScan();
      if (result) {
        setScan({
          logId: result.logId,
          mapped: result.mapped,
          renters: result.renters,
          file: result.file,
          editPropertyId: result.targetPropertyId ?? undefined,
        });
        setDrawerOpen(true);
      }
    }
  }, [scanView, scanSession, location.pathname, consumeScan]);
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

  // Memoized so the `data` reference passed to useReactTable is stable across renders;
  // an always-new array sends TanStack into an infinite re-render loop that freezes the tab.
  const filtered = useMemo(
    () => (properties ?? []).filter((p) =>
      `${p.address} ${p.city} ${p.property_owner ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    ),
    [properties, search],
  );

  // Distinct owners across all properties — drives the Owner column's dropdown filter.
  // DataTable applies the locale-aware ordering to every column filter.
  const ownerOptions = useMemo(
    () => Array.from(new Set(
      (properties ?? [])
        .map((p) => p.property_owner?.trim())
        .filter((o): o is string => !!o),
    )),
    [properties],
  );

  const columns = usePropertyColumns(ownerOptions);
  const { table } = useDataTable(columns, filtered, [], 'properties');
  // Rows currently visible after column filters + sort — selection acts on these.
  const visibleRows = table.getRowModel().rows.map((r) => r.original);

  const qc = useQueryClient();
  const sel = useSelectMode({
    items: visibleRows,
    deleteItem: deleteProperty,
    onDeleted: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });

  const occupied = filtered.filter((p) => p.hasRenters).length;
  const totalMonthly = filtered.reduce((sum, p) => sum + getTotalCurrentMonthlyRent(p.renters), 0);

  if (error) return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <EmptyState icon={undefined} title={t('error.loadFailed')} action={
        <button onClick={() => refetch()} className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>{t('common.retry')}</button>
      } />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 gap-y-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.properties')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {isLoading ? (
              <Skeleton width={220} height={14} />
            ) : (
              <>
                {t('property.headerMeta', { total: filtered.length, occupied })}
                {totalMonthly > 0 && <> · <LtrSpan>{formatMoney(totalMonthly)}</LtrSpan>{t('common.perMonth')}</>}
              </>
            )}
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
              onClick={() => sel.enter()}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <CheckSquare size={14} /> {t('common.select')}
            </button>
            <AddMenu
              label={t('property.addPropertyAction')}
              onManual={openBlankPropertyForm}
              onScan={() => beginScan({ target: 'property', originPath: location.pathname })}
            />
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('property.searchPlaceholder')}
          className="h-9 rounded-[9px] px-3 text-sm flex-1 basis-full sm:basis-auto sm:min-w-[200px] sm:max-w-[300px] outline-none transition-colors"
          style={{
            background: 'var(--color-input-filled-background)',
            border: '1px solid var(--color-outline)',
            color: 'var(--color-text-primary)',
          }}
        />
        <div className="flex-1" />
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

      {/* Content. The anchor sits on a wrapper rather than the grid or the table, because
          which of those renders depends on the view mode and the viewport. */}
      <div ref={listAnchorRef}>
      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={undefined}
          title={search ? t('empty.noResults') : t('empty.properties')}
          description={search ? undefined : t('empty.propertiesDesc')}
          action={
            !search ? (
              <button
                onClick={openBlankPropertyForm}
                className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {t('property.addNew')}
              </button>
            ) : undefined
          }
        />
      ) : view === 'card' || isMobile ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              isSelectMode={sel.isSelectMode}
              isSelected={sel.selectedIds.has(p.id)}
              onToggle={sel.toggle}
              onLongPress={sel.enter}
            />
          ))}
        </div>
      ) : (
        <DataTable
          table={table}
          rowId={(p) => p.id}
          onRowClick={(p) => navigate(`/properties/${p.id}`)}
          isSelectMode={sel.isSelectMode}
          selectedIds={sel.selectedIds}
          allSelected={sel.allSelected}
          someSelected={sel.someSelected}
          onToggle={sel.toggle}
          onToggleAll={sel.toggleAll}
        />
      )}
      </div>

      <PropertyFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        propertyId={scan?.editPropertyId}
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
