import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, TrendingUp, TrendingDown, FileText, ChevronRight } from 'lucide-react';
import { useOverdueRenters, useExpiringRenters } from '../queries';
import { useTransactionSummary, useTransactions } from '@/features/transactions/queries';
import { useProperties } from '@/features/properties/queries';
import { useRenters } from '@/features/renters/queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: overdueRenters = [] } = useOverdueRenters();
  const { data: expiringRenters = [] } = useExpiringRenters(60);
  const { data: summary } = useTransactionSummary();
  const { data: properties = [] } = useProperties();
  const { data: renters = [] } = useRenters();
  const { data: recentTxPages } = useTransactions({});
  const recentTransactions = recentTxPages?.pages[0]?.slice(0, 5) ?? [];
  const heroBucket = summary?.six_month_buckets?.at(-1);

  const now = new Date();
  const greeting = now.getHours() < 12
    ? t('home.goodMorning', 'Good morning')
    : now.getHours() < 18
    ? t('home.goodAfternoon', 'Good afternoon')
    : t('home.goodEvening', 'Good evening');

  return (
    <PageContainer>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{greeting}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Portfolio stats */}
      {heroBucket && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('home.properties', 'Properties'), value: properties.length.toString(), suffix: '' },
            { label: t('home.renters', 'Renters'), value: renters.length.toString(), suffix: '' },
            { label: t('transactions.revenue'), value: formatMoney(heroBucket.revenue), color: 'var(--color-rev-fg)', bg: 'var(--color-rev-bg)' },
            { label: t('transactions.expenses'), value: formatMoney(heroBucket.expenses), color: 'var(--color-exp-fg)', bg: 'var(--color-exp-bg)' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-4" style={s.bg ? { backgroundColor: s.bg } : {}}>
              <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
              <LtrSpan className="text-xl font-bold mt-1 block" style={s.color ? { color: s.color } : { color: 'var(--color-text-primary)' }}>
                {s.value}
              </LtrSpan>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Attention */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            {t('home.needsAttention', 'Needs Attention')}
          </h2>
          <div className="space-y-3">
            {/* Overdue */}
            {overdueRenters.length > 0 && (
              <div className="rounded-2xl bg-[var(--color-exp-bg)] border border-[var(--color-exp-fg)]/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-[var(--color-exp-fg)]" />
                  <span className="text-sm font-semibold text-[var(--color-exp-fg)]">
                    {t('home.overdueRent', 'Overdue Rent')} ({overdueRenters.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {overdueRenters.slice(0, 3).map((r) => (
                    <button
                      key={r.renter_id}
                      onClick={() => navigate(`/renters/${r.renter_id}`)}
                      className="w-full flex items-center justify-between text-start hover:opacity-80"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.first_name} {r.last_name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{r.property_address} · {r.days_overdue}d overdue</p>
                      </div>
                      <LtrSpan className="text-sm font-semibold text-[var(--color-exp-fg)]">{formatMoney(r.monthly_amount)}</LtrSpan>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring leases */}
            {expiringRenters.length > 0 && (
              <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-[var(--color-secondary)]" />
                  <span className="text-sm font-semibold text-[var(--color-secondary)]">
                    {t('home.expiringLeases', 'Expiring Leases')} ({expiringRenters.length})
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
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.first_name} {r.last_name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{r.property_address} · {r.days_until_expiry}d left</p>
                      </div>
                      <ChevronRight size={14} className="text-[var(--color-text-secondary)]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {overdueRenters.length === 0 && expiringRenters.length === 0 && (
              <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">{t('home.allGood', 'All caught up!')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {t('home.recentTransactions', 'Recent Transactions')}
            </h2>
            <button onClick={() => navigate('/transactions')} className="text-xs text-[var(--color-primary)] hover:underline">
              {t('common.viewAll', 'View all')}
            </button>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">{t('empty.transactions')}</div>
            ) : recentTransactions.map((tx) => (
              <button
                key={tx.id}
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="w-full flex items-center gap-3 p-4 text-start hover:bg-[var(--color-input-bg)] transition-colors"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tx.type === 'revenue' ? 'bg-[var(--color-rev-bg)]' : 'bg-[var(--color-exp-bg)]'}`}>
                  {tx.type === 'revenue'
                    ? <TrendingUp size={14} style={{ color: 'var(--color-rev-fg)' }} />
                    : <TrendingDown size={14} style={{ color: 'var(--color-exp-fg)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{tx.property_name ?? '—'}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{tx.date_of_payment}</p>
                </div>
                <LtrSpan className={`text-sm font-semibold shrink-0 ${tx.type === 'revenue' ? 'text-[var(--color-rev-fg)]' : 'text-[var(--color-exp-fg)]'}`}>
                  {tx.type === 'revenue' ? '+' : '-'}{formatMoney(tx.amount)}
                </LtrSpan>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports card */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/reports')}
          className="w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 flex items-center gap-4 hover:bg-[var(--color-input-bg)] transition-colors text-start"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <FileText size={22} className="text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-text-primary)]">{t('screens.reports')}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{t('home.reportsSubtitle', 'Generate income & expense reports')}</p>
          </div>
          <ChevronRight size={18} className="text-[var(--color-text-secondary)] shrink-0" />
        </button>
      </div>
    </PageContainer>
  );
}
