import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RenterFormDrawer } from './RenterFormDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { ChevronLeft, ChevronRight, Pencil, Plus, Phone, Mail, MessageSquare, Building2, MapPin, Car, Zap, Droplets, Shield, CreditCard, Calendar, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useRenter } from '../queries';
import { useProperty } from '@/features/properties/queries';
import { useTransactions } from '@/features/transactions/queries';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { PropTile } from '@/shared/components/ui/PropTile';
import { formatMoney } from '@/shared/utils/money';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import type { Renter, Transaction } from '@/shared/types';

// ─── helpers ────────────────────────────────────────────────────────────────

import i18n from '@/core/i18n';

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function HeroStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'success' | 'danger' | 'warning' }) {
  const color =
    tone === 'success' ? 'var(--color-success)' :
    tone === 'danger'  ? 'var(--color-error)'   :
    tone === 'warning' ? 'var(--color-warning)'  :
    'var(--color-text-primary)';
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

function DetailRow({ icon: Icon, label, value, href, last = false }: { icon: React.ElementType; label: string; value: string | null | undefined; href?: string; last?: boolean }) {
  if (!value) return null;
  const valueEl = href ? (
    <a href={href} className="text-[13px] font-semibold hover:underline" style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</a>
  ) : (
    <span className="text-[13px] font-semibold text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  );
  return (
    <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <Icon size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
      <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      {valueEl}
    </div>
  );
}

// ─── LeaseTimeline ────────────────────────────────────────────────────────────

function LeaseTimeline({ renter }: { renter: Renter }) {
  const { t } = useTranslation();
  const years = renter.lease_years ?? [];
  const leaseEnd = getLeaseEndDate(renter);
  const leaseStart = renter.lease_start;

  const yearsLabel = years.length === 1 ? t('renter.yearsCount', { count: 1 }) : t('renter.yearsCount_plural', { count: years.length });

  return (
    <DetailPanel title={t('renter.leaseTimeline')}>
      <div className="p-5">
        {/* Date range header */}
        <div className="flex items-center justify-between mb-3 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{leaseStart ? fmtDate(leaseStart) : '—'} → {leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : '—'}</span>
          <span>{yearsLabel}</span>
        </div>

        {/* Year strip */}
        <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
          {years.map((y, i) => {
            const isCurrent = isCurrentLeaseYear(leaseStart, i);
            const isOption = y.type === 'option';
            const bgColor = isCurrent ? 'var(--color-rev-bg)' : isOption ? 'var(--color-input-filled-background)' : 'var(--color-surface)';
            const typeLabel = isOption ? t('renter.optionYear') : t('renter.contractYear');
            return (
              <div
                key={i}
                className="flex-1 relative px-2.5 py-3"
                style={{ background: bgColor, borderInlineEnd: i === years.length - 1 ? 'none' : '1px solid var(--color-outline)' }}
              >
                {isCurrent && (
                  <span className="absolute top-1.5 end-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-rev-fg)' }}>{t('renter.currentLease')}</span>
                )}
                <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{getLeaseYearLabel(leaseStart, i)}</p>
                <LtrSpan className="text-[16px] font-bold mt-1 block" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(y.amount)}</LtrSpan>
                <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: isOption ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                  {typeLabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {[
            { color: 'var(--color-rev-bg)', label: t('renter.currentYear') },
            { color: 'var(--color-surface)', label: t('renter.contractYear'), border: true },
            { color: 'var(--color-input-filled-background)', label: t('renter.optionYear') },
          ].map(({ color, label, border }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: color, border: border ? '1px solid var(--color-outline)' : 'none' }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}

// ─── tabs ────────────────────────────────────────────────────────────────────

function LeaseInfoTab({ renter }: { renter: Renter }) {
  const { t } = useTranslation();
  const extras = renter.extra_contacts ?? [];
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      {/* Left column */}
      <div className="flex flex-col gap-4">
        <LeaseTimeline renter={renter} />

        <DetailPanel title={t('renter.insurancePanel')}>
          {renter.insurance_type ? (
            <div>
              <DetailRow icon={Shield} label={t('renter.insuranceTypeLabel')} value={renter.insurance_type} />
              <DetailRow icon={CreditCard} label={t('renter.insuranceAmountLabel')} value={renter.insurance_amount ? formatMoney(renter.insurance_amount) : null} last />
            </div>
          ) : (
            <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('renter.noInsurance')}</p>
          )}
        </DetailPanel>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <DetailPanel title={t('renter.contactPanel')}>
          <DetailRow icon={Phone} label={t('renter.phone')} value={renter.phone} href={`tel:${renter.phone}`} />
          <DetailRow icon={Mail} label={t('renter.email')} value={renter.email} href={`mailto:${renter.email}`} last />
        </DetailPanel>

        <DetailPanel title={t('renter.paymentPanel')}>
          <DetailRow icon={CreditCard} label={t('renter.paymentMethod')} value={renter.payment_type} />
          <DetailRow icon={Calendar} label={t('renter.payDay')} value={renter.payment_day_of_month ? t('renter.payDayValue', { day: renter.payment_day_of_month }) : null} last />
        </DetailPanel>

        <DetailPanel title={t('renter.extraContactsPanel', { count: extras.length })}>
          {extras.length === 0 ? (
            <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('renter.noExtraContacts')}</p>
          ) : extras.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: i === extras.length - 1 ? 'none' : '1px solid var(--color-outline)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)' }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                <p className="text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>{c.phone}</p>
              </div>
              <a href={`tel:${c.phone}`} className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}>
                <Phone size={14} />
              </a>
            </div>
          ))}
        </DetailPanel>
      </div>
    </div>
  );
}

function PropertyTab({ renter }: { renter: Renter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const p = renter.property;
  const { data: fullProp } = useProperty(p?.id ?? 0, { enabled: !!p?.id });

  if (!p) {
    return <EmptyState icon={undefined} title={t('renter.noPropertyLinked')} description={t('renter.noPropertyLinkedDesc')} />;
  }

  const propBg = getPropertyColorBg(p.id, 0.25);
  const parking = fullProp?.parking_numbers?.filter(Boolean).join(', ') ?? null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
      {/* Tinted card */}
      <div className="rounded-[var(--radius-card)] p-6 flex flex-col gap-5" style={{ background: propBg, border: '1px solid var(--color-outline)' }}>
        <div className="flex items-center justify-between">
          <Pill tone="success">{t('property.occupancy.occupied')}</Pill>
          <button
            onClick={() => navigate(`/properties/${p.id}`)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium"
            style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--color-text-primary)', border: 'none', cursor: 'pointer' }}
          >
            {t('renter.openProperty')} <ArrowRight size={12} />
          </button>
        </div>
        <PropTile propertyId={p.id} size={80} />
        <div>
          <p className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.4px' }}>{p.address}</p>
          <div className="flex items-center gap-1 mt-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            <MapPin size={12} /> {p.city}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <DetailPanel title={t('property.atAGlance')}>
          <DetailRow icon={Building2} label={t('property.colType')} value={p.type} />
          <DetailRow icon={Car} label={t('property.parking')} last value={parking} />
        </DetailPanel>
        <DetailPanel title={t('renter.metersPanel')}>
          <DetailRow icon={Zap} label={t('property.electricMeter')} value={fullProp?.electricity_meter_number ?? null} />
          <DetailRow icon={Droplets} label={t('property.waterMeter')} value={fullProp?.water_meter_number ?? null} last />
        </DetailPanel>
      </div>
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: Transaction[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (transactions.length === 0) {
    return <EmptyState icon={undefined} title={t('renter.noTransactionsYet')} />;
  }

  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      {transactions.map((tx) => {
        const isRev = tx.type === 'revenue';
        return (
          <button
            key={tx.id}
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
                {isRev ? t('renter.rentPayment') : (tx.supplier_name ?? (tx.category_name ? translateCategory(tx.category_name, t) : '—'))}
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {tx.date_of_payment}
              </p>
            </div>
            <LtrSpan className="text-[13.5px] font-semibold shrink-0" style={{ color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
              {isRev ? '+' : '−'}{formatMoney(tx.amount)}
            </LtrSpan>
          </button>
        );
      })}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type TabId = 'info' | 'property' | 'transactions';

export function RenterDetailPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const renterId = Number(id);
  const [tab, setTab] = useState<TabId>('info');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);

  const { data: renter, isLoading } = useRenter(renterId);
  const { data: txPages } = useTransactions({ renterId });
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const transactions = txPages?.pages.flat() ?? [];

  if (isLoading) return <PageLoader />;
  if (!renter) return null;

  // Derive status
  const overdueIds = new Set((overdueList as OverdueRenter[]).map((r) => r.renter_id));
  const expiringIds = new Set((expiringList as ExpiringRenter[]).map((r) => r.renter_id));
  const status = overdueIds.has(renter.id) ? 'overdue' : expiringIds.has(renter.id) ? 'expiring' : 'active';

  const monthly = getRenterMonthlyRent(renter);
  const leaseEnd = getLeaseEndDate(renter);
  const days = daysUntil(leaseEnd);
  const totalPaid = transactions.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const heroBg = getPropertyColorBg(renter.id, 0.12);
  const avatarColor = getPropertyColor(renter.id);
  const avatarBg = getPropertyColorBg(renter.id, 0.18);

  const pillTone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
  const pillLabel = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: t('renter.tabLeaseInfo') },
    { id: 'property', label: t('renter.tabProperty') },
    { id: 'transactions', label: t('renter.tabTransactionsCount', { count: transactions.length }) },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ background: heroBg, borderBottom: '1px solid var(--color-outline)', padding: '24px 40px 0' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/renters')}
          className="inline-flex items-center gap-1 text-[12px] font-medium mb-3.5"
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} {t('renter.allRenters')}
        </button>

        {/* Header row */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-4 items-start">
            {/* Large avatar */}
            <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full text-[28px] font-bold" style={{ background: avatarBg, color: avatarColor }}>
              {(renter.first_name[0] + renter.last_name[0]).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill tone={pillTone} size="md">{pillLabel}</Pill>
                {renter.lease_start && (
                  <Pill tone="neutral" size="md">{t('renter.since', { date: fmtDate(renter.lease_start) })}</Pill>
                )}
              </div>
              <h1 className="text-[32px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.7px', margin: 0 }}>
                {renter.first_name} {renter.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                {renter.property && (
                  <span className="inline-flex items-center gap-1.5"><Building2 size={13} /> {renter.property.address}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {renter.phone}</span>
                <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {renter.email}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${renter.phone}`} className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <Phone size={14} /> {t('common.call', 'Call')}
            </a>
            <a href={`sms:${renter.phone}`} className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <MessageSquare size={14} /> {t('renter.sms')}
            </a>
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
              <Plus size={14} /> {t('renter.recordPayment')}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 mt-7 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <HeroStat label={t('renter.monthlyRent')} value={formatMoney(monthly)} />
          <HeroStat
            label={t('renter.leaseEndsIn')}
            value={days != null ? t('renter.leaseEndsInDays', { days }) : '—'}
            sub={leaseEnd ? fmtDate(leaseEnd.toISOString().split('T')[0]) : undefined}
            tone={days != null && days < 90 ? 'warning' : undefined}
          />
          <HeroStat label={t('renter.totalPaid')} value={formatMoney(totalPaid)} sub={t('renter.paymentsCount', { count: transactions.filter((tx) => tx.type === 'revenue').length })} tone="success" />
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
        {tab === 'info' && <LeaseInfoTab renter={renter} />}
        {tab === 'property' && <PropertyTab renter={renter} />}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} />}
      </div>

      <RenterFormDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} renterId={renterId} />
      <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} initialType="revenue" />
    </div>
  );
}
