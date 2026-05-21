import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(s: string): string {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtLeaseEnd(renter: Renter): string | null {
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days > 0 ? `${days}d` : 'Expired';
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
  const navigate = useNavigate();
  const color = getPropertyColor(renter.id);
  const bg = getPropertyColorBg(renter.id);
  const monthly = getRenterMonthlyRent(renter);
  const countdown = fmtLeaseEnd(renter);

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
          <LtrSpan>{formatMoney(monthly)}</LtrSpan>/mo{countdown ? ` · ends in ${countdown}` : ''}
        </p>
      </div>
      <ChevronLeft size={15} className="rotate-180" style={{ color: 'var(--color-text-secondary)' }} />
    </button>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
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
          {isRev ? tx.renter_name : (tx.supplier_name ?? tx.category_name ?? '—')}
        </p>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRev ? 'Rent' : tx.category_name} · {fmtDate(tx.date_of_payment)}
        </p>
      </div>
      <LtrSpan className="text-[13.5px] font-semibold shrink-0" style={{ color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
        {isRev ? '+' : '−'}{formatMoney(tx.amount)}
      </LtrSpan>
    </button>
  );
}

function DocRow({ label, url, last = false }: { label: string; url: string; last?: boolean }) {
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
        <Download size={12} /> Download
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
      <DetailPanel title="Basic info">
        <DetailRow icon={MapPin} label="Address" value={`${property.address}, ${property.city}${property.zip_code ? ` ${property.zip_code}` : ''}`} />
        <DetailRow icon={Receipt} label="Type" value={t(`property.type_${property.type}` as never, property.type)} />
        <DetailRow icon={Users} label="Owner" value={property.property_owner} />
        <DetailRow icon={Receipt} label="Size" value={property.sq_ft ? `${property.sq_ft}m²` : null} />
        <DetailRow icon={Receipt} label="Rooms" value={property.number_of_rooms ? String(property.number_of_rooms) : null} />
        <DetailRow icon={Receipt} label="Floor" value={property.floor != null ? String(property.floor) : null} last />
      </DetailPanel>

      <DetailPanel title="Utilities & numbers">
        <DetailRow icon={Car} label="Parking" value={parking} />
        <DetailRow icon={Zap} label="Electric meter" value={property.electricity_meter_number} />
        <DetailRow icon={Receipt} label="Electric account" value={property.electricity_account_number} />
        <DetailRow icon={Droplets} label="Water meter" value={property.water_meter_number} />
        <DetailRow icon={Receipt} label="Water account" value={property.water_account_number} last />
      </DetailPanel>

      <DetailPanel title="Fees">
        <DetailRow icon={Receipt} label="Annual property tax" value={property.property_tax ? formatMoney(property.property_tax) : null} />
        <DetailRow icon={Receipt} label="House committee" value={property.house_committee ? `${formatMoney(property.house_committee)}/mo` : null} last />
      </DetailPanel>

      <DetailPanel title="Inventory notes">
        <div className="p-4 text-[13px] leading-relaxed" style={{ color: property.inventory_notes ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          {property.inventory_notes || 'No inventory notes yet.'}
        </div>
      </DetailPanel>
    </div>
  );
}

function RentersTab({ property }: { property: Property }) {
  const navigate = useNavigate();
  const renters = property.renters ?? [];

  if (renters.length === 0) {
    return (
      <EmptyState
        icon={undefined}
        title="No renters yet"
        description="Add a renter to start tracking lease and payments."
        action={
          <button
            onClick={() => navigate(`/renters/add?propertyId=${property.id}`)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> Add renter
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
  if (transactions.length === 0) {
    return <EmptyState icon={undefined} title="No transactions yet" />;
  }
  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
    </div>
  );
}

function DocumentsTab({ property }: { property: Property }) {
  const docs: { label: string; url: string }[] = [];
  if (property.basic_contract_url) docs.push({ label: 'Basic contract.pdf', url: property.basic_contract_url });
  if (property.land_registry_url) docs.push({ label: 'Land registry.pdf', url: property.land_registry_url });

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      <DetailPanel title="Documents">
        {docs.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>No documents uploaded yet.</p>
        ) : (
          <div className="p-2">
            {docs.map((d, i) => <DocRow key={d.label} label={d.label} url={d.url} last={i === docs.length - 1} />)}
          </div>
        )}
      </DetailPanel>

      <DetailPanel title="Upload new">
        <div className="p-4">
          <div className="rounded-[12px] p-6 text-center" style={{ border: '1.5px dashed var(--color-outline)' }}>
            <Upload size={22} className="mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Drop files here</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>PDF, JPG, PNG up to 10 MB</p>
            <label className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <Paperclip size={13} /> Choose file
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
    { id: 'info', label: 'Details' },
    { id: 'renters', label: `Renters (${rentersCount})` },
    { id: 'transactions', label: `Transactions (${transactions.length})` },
    { id: 'documents', label: 'Documents' },
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
          <ChevronLeft size={14} /> All properties
        </button>

        {/* Header row */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-4 items-start">
            <PropTile propertyId={property.id} size={84} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill tone={property.hasRenters ? 'success' : 'warning'} size="md">
                  {property.hasRenters ? 'Occupied' : 'Vacant'}
                </Pill>
                <Pill tone="neutral" size="md">{t(`property.type_${property.type}` as never, property.type)}</Pill>
              </div>
              <h1 className="text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
                {property.address}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                <MapPin size={13} />
                {property.city}{property.zip_code ? `, ${property.zip_code}` : ''}
                {property.property_owner && <> · Owned by {property.property_owner}</>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/properties/${propertyId}/edit`)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <Pencil size={14} /> {t('common.edit')}
            </button>
            <button
              onClick={() => navigate(`/transactions/add?propertyId=${propertyId}`)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> Add transaction
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <HeroStat label="Monthly rent" value={monthlyRent ? formatMoney(monthlyRent) : '—'} />
          <HeroStat label="Size" value={property.sq_ft ? `${property.sq_ft}m²` : '—'} />
          <HeroStat label="Total revenue" value={formatMoney(revTotal)} tone="success" sub="all time" />
          <HeroStat label="Total expenses" value={formatMoney(expTotal)} tone="danger" sub="all time" />
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
        {tab === 'renters' && <RentersTab property={property} />}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} />}
        {tab === 'documents' && <DocumentsTab property={property} />}
      </div>
    </div>
  );
}
