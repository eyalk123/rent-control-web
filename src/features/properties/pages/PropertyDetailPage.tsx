import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { RenterFormDrawer } from '@/features/renters/pages/RenterFormDrawer';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import {
  ChevronLeft, Pencil, Plus, MapPin, Car, Zap, Droplets,
  Receipt, Users, FileText, Upload, TrendingUp, TrendingDown,
  Paperclip, Download,
} from 'lucide-react';
import { useProperty } from '../queries';
import { useTransactions } from '@/features/transactions/queries';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { PropTile } from '@/shared/components/ui/PropTile';
import { formatMoney } from '@/shared/utils/money';
import { getPropertyColorBg, getPropertyColor } from '@/shared/utils/propertyColor';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';
import type { Property, Renter, Transaction } from '@/shared/types';

// ─── helpers ────────────────────────────────────────────────────────────────

import i18n from '@/core/i18n';

function fmtDate(s: string): string {
  const d = new Date(s);
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function fmtLeaseEnd(renter: Renter): { days: number } | 'expired' | null {
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days > 0 ? { days } : 'expired';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function HeroStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--color-success)' : tone === 'danger' ? 'var(--color-error)' : 'var(--color-text-primary)';
  return (
    <div className="px-5 py-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <LtrSpan className="text-[22px] font-bold mt-1 block" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</LtrSpan>
      {sub && <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>}
    </div>
  );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <header className="px-[18px] py-3.5 text-[14px] font-bold" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-outline)' }}>
        {title}
      </header>
      <div>{children}</div>
    </section>
  );
}

function DetailRow({ icon: Icon, label, value, last = false }: { icon: React.ElementType; label: string; value: string | null | undefined; last?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <Icon size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
      <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-[13px] font-semibold text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function RenterMiniCard({ renter }: { renter: Renter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const color = getPropertyColor(renter.id);
  const bg = getPropertyColorBg(renter.id);
  const monthly = getRenterMonthlyRent(renter);
  const countdown = fmtLeaseEnd(renter);
  const countdownStr = countdown === 'expired'
    ? t('renter.leaseExpired')
    : countdown ? t('property.endsIn', { countdown: `${countdown.days}d` }) : null;

  return (
    <button
      onClick={() => navigate(`/renters/${renter.id}`)}
      className="flex items-center gap-3.5 p-4 rounded-[var(--radius-card)] text-start w-full transition-colors hover:opacity-90"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: bg, color }}>
        {(renter.first_name[0] + renter.last_name[0]).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{renter.first_name} {renter.last_name}</p>
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          <LtrSpan>{formatMoney(monthly)}</LtrSpan>/mo{countdownStr ? ` · ${countdownStr}` : ''}
        </p>
      </div>
      <ChevronLeft size={15} className="rotate-180" style={{ color: 'var(--color-text-secondary)' }} />
    </button>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRev = tx.type === 'revenue';
  return (
    <button
      onClick={() => navigate(`/transactions/${tx.id}`)}
      className="flex items-center gap-3 w-full px-4 py-3 text-start transition-colors hover:bg-[var(--color-input-filled-background)]"
      style={{ borderBottom: '1px solid var(--color-outline)' }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: isRev ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)', color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}>
        {isRev ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {isRev ? tx.renter_name : (tx.supplier_name ?? (tx.category_name ? translateCategory(tx.category_name, t) : '—'))}
        </p>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRev ? t('property.rent') : translateCategory(tx.category_name, t)} · {fmtDate(tx.date_of_payment)}
        </p>
      </div>
      <LtrSpan className="text-[13.5px] font-semibold shrink-0" style={{ color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
        {isRev ? '+' : '−'}{formatMoney(tx.amount)}
      </LtrSpan>
    </button>
  );
}

function DocRow({ label, url, last = false }: { label: string; url: string; last?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--color-exp-bg)', color: 'var(--color-exp-fg)' }}>
        <FileText size={16} />
      </div>
      <p className="flex-1 text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 h-7 px-2.5 rounded-[7px] text-[12px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        <Download size={12} /> {t('common.download')}
      </a>
    </div>
  );
}

// ─── tabs ───────────────────────────────────────────────────────────────────

function DetailsTab({ property }: { property: Property }) {
  const { t } = useTranslation();
  const parking = property.parking_numbers?.filter(Boolean).join(', ') || null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <DetailPanel title={t('property.basicInfo')}>
        <DetailRow icon={MapPin} label={t('property.address')} value={`${property.address}, ${property.city}${property.zip_code ? ` ${property.zip_code}` : ''}`} />
        <DetailRow icon={Receipt} label={t('property.type')} value={t(`property.type_${property.type}` as never, property.type)} />
        <DetailRow icon={Users} label={t('property.owner')} value={property.property_owner} />
        <DetailRow icon={Receipt} label={t('property.size')} value={property.sq_ft ? `${property.sq_ft}m²` : null} />
        <DetailRow icon={Receipt} label={t('property.rooms')} value={property.number_of_rooms ? String(property.number_of_rooms) : null} />
        <DetailRow icon={Receipt} label={t('property.floor')} value={property.floor != null ? String(property.floor) : null} last />
      </DetailPanel>

      <DetailPanel title={t('property.utilitiesNumbers')}>
        <DetailRow icon={Car} label={t('property.parking')} value={parking} />
        <DetailRow icon={Zap} label={t('property.electricMeter')} value={property.electricity_meter_number} />
        <DetailRow icon={Receipt} label={t('property.electricAccount')} value={property.electricity_account_number} />
        <DetailRow icon={Droplets} label={t('property.waterMeter')} value={property.water_meter_number} />
        <DetailRow icon={Receipt} label={t('property.waterAccount')} value={property.water_account_number} last />
      </DetailPanel>

      <DetailPanel title={t('property.fees')}>
        <DetailRow icon={Receipt} label={t('property.annualPropertyTax')} value={property.property_tax ? formatMoney(property.property_tax) : null} />
        <DetailRow icon={Receipt} label={t('property.houseCommittee')} value={property.house_committee ? `${formatMoney(property.house_committee)}${t('common.perMonth')}` : null} last />
      </DetailPanel>

      <DetailPanel title={t('property.inventoryNotesSection')}>
        <div className="p-4 text-[13px] leading-relaxed" style={{ color: property.inventory_notes ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          {property.inventory_notes || t('property.noInventoryNotes')}
        </div>
      </DetailPanel>
    </div>
  );
}

function RentersTab({ property, onAddRenter }: { property: Property; onAddRenter: () => void }) {
  const { t } = useTranslation();
  const renters = property.renters ?? [];

  if (renters.length === 0) {
    return (
      <EmptyState
        icon={undefined}
        title={t('property.noRentersYet')}
        description={t('property.noRentersDesc')}
        action={
          <button
            onClick={onAddRenter}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> {t('property.addRenterAction')}
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
      {renters.map((r) => <RenterMiniCard key={r.id} renter={r} />)}
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: Transaction[] }) {
  const { t } = useTranslation();
  if (transactions.length === 0) {
    return <EmptyState icon={undefined} title={t('property.noTransactionsYet')} />;
  }
  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
    </div>
  );
}

function DocumentsTab({ property }: { property: Property }) {
  const { t } = useTranslation();
  const docs: { label: string; url: string }[] = [];
  if (property.basic_contract_url) docs.push({ label: 'Basic contract.pdf', url: property.basic_contract_url });
  if (property.land_registry_url) docs.push({ label: 'Land registry.pdf', url: property.land_registry_url });

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      <DetailPanel title={t('property.tabDocuments')}>
        {docs.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.noDocuments')}</p>
        ) : (
          <div className="p-2">
            {docs.map((d, i) => <DocRow key={d.label} label={d.label} url={d.url} last={i === docs.length - 1} />)}
          </div>
        )}
      </DetailPanel>

      <DetailPanel title={t('property.uploadNew')}>
        <div className="p-4">
          <div className="rounded-[12px] p-6 text-center" style={{ border: '1.5px dashed var(--color-outline)' }}>
            <Upload size={22} className="mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('property.dropFiles')}</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('property.fileFormats')}</p>
            <label className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <Paperclip size={13} /> {t('property.chooseFile')}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
            </label>
          </div>
        </div>
      </DetailPanel>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type TabId = 'info' | 'renters' | 'transactions' | 'documents';

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const propertyId = Number(id);
  const [tab, setTab] = useState<TabId>('info');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);
  const [renterDrawerOpen, setRenterDrawerOpen] = useState(false);

  const { data: property, isLoading } = useProperty(propertyId);
  const { data: txPages } = useTransactions({ propertyId });
  const transactions = txPages?.pages.flat() ?? [];

  if (isLoading) return <PageLoader />;
  if (!property) return null;

  const activeRenter = property.renters?.[0];
  const monthlyRent = activeRenter ? getRenterMonthlyRent(activeRenter) : null;
  const revTotal = transactions.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const expTotal = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const heroBg = getPropertyColorBg(property.id, 0.12);
  const rentersCount = property.renters?.length ?? 0;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: t('property.tabDetails') },
    { id: 'renters', label: t('property.tabRentersCount', { count: rentersCount }) },
    { id: 'transactions', label: t('property.tabTransactionsCount', { count: transactions.length }) },
    { id: 'documents', label: t('property.tabDocuments') },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ background: heroBg, borderBottom: '1px solid var(--color-outline)', padding: '24px 40px 0' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/properties')}
          className="inline-flex items-center gap-1 text-[12px] font-medium mb-3.5"
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ChevronLeft size={14} /> {t('property.allProperties')}
        </button>

        {/* Header row */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-4 items-start">
            <PropTile propertyId={property.id} size={84} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill tone={property.hasRenters ? 'success' : 'warning'} size="md">
                  {property.hasRenters ? t('property.occupancy.occupied') : t('property.occupancy.vacant')}
                </Pill>
                <Pill tone="neutral" size="md">{t(`property.type_${property.type}` as never, property.type)}</Pill>
              </div>
              <h1 className="text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
                {property.address}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                <MapPin size={13} />
                {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
                {property.property_owner && <> · {t('property.ownedBy', { owner: property.property_owner })}</>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditDrawerOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <Pencil size={14} /> {t('common.edit')}
            </button>
            <button
              onClick={() => setTxDrawerOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> {t('property.addTransaction')}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <HeroStat label={t('property.monthlyRent')} value={monthlyRent ? formatMoney(monthlyRent) : '—'} />
          <HeroStat label={t('property.size')} value={property.sq_ft ? `${property.sq_ft}m²` : '—'} />
          <HeroStat label={t('property.totalRevenue')} value={formatMoney(revTotal)} tone="success" sub={t('common.allTime')} />
          <HeroStat label={t('property.totalExpenses')} value={formatMoney(expTotal)} tone="danger" sub={t('common.allTime')} />
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-[18px] py-3 text-[13px] transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-brand-navy)' : '2px solid transparent',
                color: tab === t.id ? 'var(--color-brand-navy)' : 'var(--color-text-secondary)',
                fontWeight: tab === t.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-10">
        {tab === 'info' && <DetailsTab property={property} />}
        {tab === 'renters' && <RentersTab property={property} onAddRenter={() => setRenterDrawerOpen(true)} />}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} />}
        {tab === 'documents' && <DocumentsTab property={property} />}
      </div>

      <PropertyFormDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} propertyId={propertyId} />
      <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} initialPropertyId={propertyId} />
      <RenterFormDrawer open={renterDrawerOpen} onClose={() => setRenterDrawerOpen(false)} initialPropertyId={propertyId} />
    </div>
  );
}
