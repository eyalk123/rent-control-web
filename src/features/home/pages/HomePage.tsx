import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, Clock, TrendingUp, TrendingDown, ArrowUpRight,
  Plus, Building2, Users,
} from 'lucide-react';
import { useOverdueRenters, useExpiringRenters } from '../queries';
import { useTransactionSummary, useTransactions } from '@/features/transactions/queries';
import { useProperties } from '@/features/properties/queries';
import { formatMoney } from '@/shared/utils/money';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { CashFlowChart } from '@/shared/components/ui/CashFlowChart';
import type { MonthSummaryItem } from '@/features/transactions/api/transactions';

import i18n from '@/core/i18n';

function bucketToChartPoint(b: MonthSummaryItem) {
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(b.year, b.month - 1, 1));
  return { month, revenue: b.revenue, expenses: b.expenses };
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: overdueRenters = [] } = useOverdueRenters();
  const { data: expiringRenters = [] } = useExpiringRenters(60);
  const { data: summary } = useTransactionSummary();
  const { data: properties = [] } = useProperties();
  const { data: recentTxPages } = useTransactions({});
  const recentTransactions = recentTxPages?.pages[0]?.slice(0, 5) ?? [];

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t('home.goodMorning') :
    hour < 18 ? t('home.goodAfternoon') :
    t('home.goodEvening');

  const chartData = (summary?.six_month_buckets ?? []).map(bucketToChartPoint);
  const currentBucket = summary?.six_month_buckets?.at(-1);
  const mtdRevenue = currentBucket?.revenue ?? 0;
  const mtdExpenses = currentBucket?.expenses ?? 0;
  const mtdProfit = mtdRevenue - mtdExpenses;

  const occupiedCount = properties.filter((p) => p.hasRenters).length;
  const occupancyPct = properties.length > 0
    ? Math.round((occupiedCount / properties.length) * 100)
    : 0;

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 pb-10 space-y-8">
      {/* Context strip */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{greeting}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{dateStr}</p>
      </div>

      {/* Hero — 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: profit + stats */}
        <div className="rounded-[var(--radius-card)] p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.netProfitMtd')}
          </p>
          <LtrSpan
            className="block text-[56px] font-bold leading-none tracking-tight"
            style={{ color: mtdProfit >= 0 ? 'var(--color-text-primary)' : 'var(--color-error)', letterSpacing: '-1.5px' }}
          >
            {mtdProfit >= 0 ? '+' : ''}{formatMoney(mtdProfit)}
          </LtrSpan>
          <div className="mt-1">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={mtdProfit >= 0
                ? { background: 'var(--color-rev-bg)', color: 'var(--color-rev-fg)' }
                : { background: 'var(--color-exp-bg)', color: 'var(--color-exp-fg)' }}
            >
              {mtdProfit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {mtdProfit >= 0 ? t('home.profitable') : t('home.inTheRed')}
            </span>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-outline)' }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('home.collected')}</p>
                <LtrSpan className="text-lg font-bold" style={{ color: 'var(--color-rev-fg)' }}>{formatMoney(mtdRevenue)}</LtrSpan>
              </div>
              <div>
                <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('home.spent')}</p>
                <LtrSpan className="text-lg font-bold" style={{ color: 'var(--color-exp-fg)' }}>{formatMoney(mtdExpenses)}</LtrSpan>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cash-flow chart */}
        <div className="rounded-[var(--radius-card)] p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('home.cashFlow')}</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1" style={{ color: 'var(--color-rev-fg)' }}>
                <span className="inline-block h-1.5 w-3 rounded-full" style={{ background: 'var(--color-rev-fg)' }} />{t('home.revenue')}
              </span>
              <span className="flex items-center gap-1" style={{ color: 'var(--color-exp-fg)' }}>
                <span className="inline-block h-1.5 w-3 rounded-full" style={{ background: 'var(--color-exp-fg)' }} />{t('home.expenses')}
              </span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <CashFlowChart data={chartData} height={180} />
          ) : (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('home.noData')}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('home.quickActions')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { labelKey: 'home.recordRevenue', icon: TrendingUp, to: '/transactions/add?type=revenue', color: 'var(--color-rev-fg)', bg: 'var(--color-rev-bg)' },
            { labelKey: 'home.recordExpense', icon: TrendingDown, to: '/transactions/add?type=expense', color: 'var(--color-exp-fg)', bg: 'var(--color-exp-bg)' },
            { labelKey: 'screens.addRenter', icon: Users, to: '/renters/add', color: 'var(--color-primary)', bg: 'var(--color-primary-container)' },
            { labelKey: 'screens.addProperty', icon: Building2, to: '/properties/add', color: 'var(--color-primary)', bg: 'var(--color-primary-container)' },
          ].map(({ labelKey, icon: Icon, to, color, bg }) => (
            <button
              key={labelKey}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-[var(--radius-card)] transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg }}>
                <Icon size={18} style={{ color }} strokeWidth={2} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Needs attention + Portfolio occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Needs attention */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.needsAttention')}
          </p>
          <div className="space-y-3">
            {overdueRenters.length > 0 && (
              <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-exp-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                    {t('home.overdueRent')} ({overdueRenters.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {overdueRenters.slice(0, 3).map((r) => (
                    <button
                      key={r.renter_id}
                      onClick={() => navigate(`/renters/${r.renter_id}`)}
                      className="w-full flex items-center justify-between text-start hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.property_address} · {t('home.daysOverdue', { count: r.days_overdue })}</p>
                      </div>
                      <LtrSpan className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-exp-fg)' }}>{formatMoney(r.monthly_amount)}</LtrSpan>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expiringRenters.length > 0 && (
              <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} style={{ color: 'var(--color-warning)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                    {t('home.expiringLeases')} ({expiringRenters.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {expiringRenters.slice(0, 3).map((r) => (
                    <button
                      key={r.renter_id}
                      onClick={() => navigate(`/renters/${r.renter_id}`)}
                      className="w-full flex items-center justify-between text-start hover:opacity-80"
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.property_address} · {t('home.expiresIn', { count: r.days_until_expiry })}</p>
                      </div>
                      <ArrowUpRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {overdueRenters.length === 0 && expiringRenters.length === 0 && (
              <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allGood')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio occupancy */}
        <div className="rounded-[var(--radius-card)] p-6 flex flex-col" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-2">{t('home.portfolioOccupancy')}</p>
          <p className="text-6xl font-bold leading-none tracking-tight" style={{ letterSpacing: '-1px' }}>
            {occupancyPct}%
          </p>
          <p className="text-sm opacity-65 mt-1">{t('home.occupancyMeta', { occupied: occupiedCount, total: properties.length })}</p>

          {/* Property strip */}
          <div className="flex gap-1.5 mt-auto pt-5">
            {properties.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/properties/${p.id}`)}
                title={p.address}
                className="flex-1 h-6 rounded-[4px] min-w-0 transition-opacity hover:opacity-80"
                style={{
                  background: p.hasRenters ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px] opacity-55">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.35)' }} />{t('home.occupied')}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.12)' }} />{t('home.vacant')}
            </span>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.recentTransactions')}
          </p>
          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-1 text-xs font-medium hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('common.viewAll')} <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>

        <div className="rounded-[var(--radius-card)]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('empty.transactions')}
            </div>
          ) : recentTransactions.map((tx, i) => (
            <button
              key={tx.id}
              onClick={() => navigate(`/transactions/${tx.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:opacity-90 transition-opacity"
              style={{ borderTop: i > 0 ? '1px solid var(--color-subtle-outline)' : 'none' }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: tx.type === 'revenue' ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)' }}
              >
                {tx.type === 'revenue'
                  ? <TrendingUp size={14} style={{ color: 'var(--color-rev-fg)' }} />
                  : <TrendingDown size={14} style={{ color: 'var(--color-exp-fg)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {tx.renter_name ?? tx.property_name ?? '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tx.property_name} · {tx.date_of_payment}
                </p>
              </div>
              <LtrSpan
                className="text-sm font-semibold shrink-0"
                style={{ color: tx.type === 'revenue' ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}
              >
                {tx.type === 'revenue' ? '+' : '−'}{formatMoney(tx.amount)}
              </LtrSpan>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
