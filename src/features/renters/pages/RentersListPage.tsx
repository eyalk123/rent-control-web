import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Mail } from 'lucide-react';
import { RenterFormDrawer } from './RenterFormDrawer';
import { useRenters } from '../queries';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { Pill } from '@/shared/components/ui/Pill';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { formatMoney } from '@/shared/utils/money';
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

function RenterCard({ renter, status }: { renter: Renter; status: RenterStatus }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const color = getPropertyColor(renter.id);
  const bg = getPropertyColorBg(renter.id);
  const monthly = getRenterMonthlyRent(renter);
  const leaseEnd = fmtLeaseEnd(renter);
  const pillTone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
  const pillLabel = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/renters/${renter.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/renters/${renter.id}`); }}
      className="flex flex-col gap-2.5 rounded-[var(--radius-card)] p-3 cursor-pointer transition-all hover:-translate-y-px text-start"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      {/* Avatar + name + status pill */}
      <div className="flex items-center gap-3">
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
            {renter.property?.address ?? '—'}
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

function RenterTable({ renters, statusMap }: { renters: Renter[]; statusMap: Map<number, RenterStatus> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-outline)', background: 'var(--color-input-filled-background)' }}>
            {[
              t('renter.colRenter'), t('property.colProperty'), t('renter.colPhone'),
              t('property.rent'), t('renter.leaseEnds'), t('property.colStatus'),
            ].map((h) => (
              <th key={h} className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renters.map((r, i) => {
            const color = getPropertyColor(r.id);
            const bg = getPropertyColorBg(r.id);
            const monthly = getRenterMonthlyRent(r);
            const leaseEnd = fmtLeaseEnd(r);
            const status = statusMap.get(r.id) ?? 'active';
            const pillTone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
            const pillLabel = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');

            return (
              <tr
                key={r.id}
                onClick={() => navigate(`/renters/${r.id}`)}
                className="cursor-pointer hover:bg-[var(--color-input-filled-background)] transition-colors"
                style={{ borderTop: i > 0 ? '1px solid var(--color-subtle-outline)' : 'none' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: bg, color }}>
                      {(r.first_name[0] + r.last_name[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{r.property?.address ?? '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.phone}</td>
                <td className="px-4 py-3 text-sm font-semibold">
                  <LtrSpan style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(monthly)}</LtrSpan>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{leaseEnd ?? '—'}</td>
                <td className="px-4 py-3"><Pill tone={pillTone}>{pillLabel}</Pill></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'expiring' | 'overdue';
type ViewMode = 'card' | 'table';

export function RentersListPage() {
  const { t } = useTranslation();
  const { data: renters = [], isLoading, error, refetch } = useRenters();
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('card');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Build status map
  const overdueIds = new Set((overdueList as OverdueRenter[]).map((r) => r.renter_id));
  const expiringIds = new Set((expiringList as ExpiringRenter[]).map((r) => r.renter_id));
  const statusMap = new Map<number, RenterStatus>(
    renters.map((r) => [r.id, overdueIds.has(r.id) ? 'overdue' : expiringIds.has(r.id) ? 'expiring' : 'active'])
  );

  const counts = {
    all: renters.length,
    active: renters.filter((r) => statusMap.get(r.id) === 'active').length,
    expiring: renters.filter((r) => statusMap.get(r.id) === 'expiring').length,
    overdue: renters.filter((r) => statusMap.get(r.id) === 'overdue').length,
  };

  const filtered = renters.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!`${r.first_name} ${r.last_name} ${r.phone} ${r.email}`.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && statusMap.get(r.id) !== statusFilter) return false;
    return true;
  });

  if (error) return (
    <div className="max-w-6xl mx-auto px-8 py-8">
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
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-0">
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
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={14} /> {t('property.addRenterAction')}
        </button>
      </div>

      {/* Status tabs + search + view toggle */}
      <div className="flex items-center gap-0 pt-1" style={{ borderBottom: '1px solid var(--color-outline)' }}>
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
        <div className="flex items-center gap-2 pb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('renter.searchPlaceholder')}
            className="h-9 rounded-[9px] px-3 text-sm w-[240px] outline-none"
            style={{
              background: 'var(--color-input-filled-background)',
              border: '1px solid var(--color-outline)',
              color: 'var(--color-text-primary)',
            }}
          />
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
        ) : view === 'card' ? (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((r) => <RenterCard key={r.id} renter={r} status={statusMap.get(r.id) ?? 'active'} />)}
          </div>
        ) : (
          <RenterTable renters={filtered} statusMap={statusMap} />
        )}
      </div>

      <RenterFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
