import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/shared/utils/money';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import type { Transaction } from '@/shared/types';

interface Props {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
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
        {transactions.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('empty.transactions')}
          </div>
        ) : transactions.map((tx, i) => (
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
  );
}
