import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/utils/money';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import type { MonthSummaryItem } from '@/features/transactions/api/transactions';

interface Props {
  currentBucket: MonthSummaryItem | undefined;
}

export function NetProfitCard({ currentBucket }: Props) {
  const { t } = useTranslation();

  const mtdRevenue = currentBucket?.revenue ?? 0;
  const mtdExpenses = currentBucket?.expenses ?? 0;
  const mtdProfit = mtdRevenue - mtdExpenses;

  return (
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
  );
}
