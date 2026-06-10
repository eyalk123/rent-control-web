import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, AlertCircle, Download, CheckSquare } from 'lucide-react';
import { useProperties, propertyKeys } from '../queries';
import { deleteProperty } from '../api/properties';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { EmptyState } from '@/shared/components/ui/EmptyState';
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
import { formatMoney } from '@/shared/utils/money';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Property } from '@/shared/types';

import i18n from '@/core/i18n';
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
  const monthlyRent = activeRenter ? getRenterMonthlyRent(activeRenter) : null;
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
      <div className="relative w-full" style={{ aspectRatio: '4/3', background: imageSrc ? 'var(--color-input-filled-background)' : bg }}>
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

interface PropertyTableProps {
  properties: Property[];
  isSelectMode: boolean;
  selectedIds: Set<number>;
  allSelected: boolean;
  someSelected: boolean;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
}

function PropertyTable({ properties, isSelectMode, selectedIds, allSelected, someSelected, onToggle, onToggleAll }: PropertyTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-[var(--radius-card)] overflow-x-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-outline)', background: 'var(--color-input-filled-background)' }}>
            {isSelectMode && (
              <th className="px-4 py-3 w-px">
                <button type="button" onClick={onToggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <TriStateCheckbox checked={allSelected} indeterminate={someSelected} />
                </button>
              </th>
            )}
            {[
              t('property.colProperty'), t('property.colType'), t('property.colOwner'),
              t('property.renters'), t('property.rent'), t('property.colStatus'),
            ].map((h) => (
              <th key={h} className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {properties.map((p, i) => {
            const activeRenter = p.renters?.[0];
            const monthlyRent = activeRenter ? getRenterMonthlyRent(activeRenter) : null;
            const selected = selectedIds.has(p.id);
            return (
              <tr
                key={p.id}
                onClick={() => isSelectMode ? onToggle(p.id) : navigate(`/properties/${p.id}`)}
                className="cursor-pointer hover:bg-[var(--color-input-filled-background)] transition-colors"
                style={{ borderTop: i > 0 ? '1px solid var(--color-subtle-outline)' : 'none', background: selected ? 'var(--color-input-filled-background)' : undefined }}
              >
                {isSelectMode && (
                  <td className="px-4 py-3"><TriStateCheckbox checked={selected} /></td>
                )}
                <td className="px-4 py-3">
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.address}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{p.city}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(`property.type_${p.type}` as never, p.type)}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {p.property_owner ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {p.renters?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <LtrSpan style={{ color: 'var(--color-text-primary)' }}>
                    {monthlyRent ? formatMoney(monthlyRent) : '—'}
                  </LtrSpan>
                </td>
                <td className="px-4 py-3">
                  <StatusPill hasRenters={!!p.hasRenters} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ViewMode = 'card' | 'table';

export function PropertiesListPage() {
  const { t } = useTranslation();
  const { data: properties, isLoading, error, refetch } = useProperties();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('card');
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

  const filtered = (properties ?? []).filter((p) =>
    `${p.address} ${p.city} ${p.property_owner ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  const qc = useQueryClient();
  const sel = useSelectMode({
    items: filtered,
    deleteItem: deleteProperty,
    onDeleted: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });

  const occupied = filtered.filter((p) => p.hasRenters).length;
  const totalMonthly = filtered.reduce((sum, p) => {
    const r = p.renters?.[0];
    return sum + (r ? getRenterMonthlyRent(r) : 0);
  }, 0);

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
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <Download size={14} /> {t('common.export')}
            </button>
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
              <Plus size={14} /> {t('property.addPropertyAction')}
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('property.searchPlaceholder')}
          className="h-9 rounded-[9px] px-3 text-sm flex-1 min-w-[200px] max-w-[300px] outline-none transition-colors"
          style={{
            background: 'var(--color-input-filled-background)',
            border: '1px solid var(--color-outline)',
            color: 'var(--color-text-primary)',
          }}
        />
        <div className="flex-1" />
        <div className="hidden lg:block">
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

      {/* Content */}
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
                onClick={() => setDrawerOpen(true)}
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
        <PropertyTable
          properties={filtered}
          isSelectMode={sel.isSelectMode}
          selectedIds={sel.selectedIds}
          allSelected={sel.allSelected}
          someSelected={sel.someSelected}
          onToggle={sel.toggle}
          onToggleAll={sel.toggleAll}
        />
      )}

      <PropertyFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
