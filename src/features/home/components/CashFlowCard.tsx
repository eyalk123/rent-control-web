import { useTranslation } from 'react-i18next';
import { CashFlowChart } from '@/shared/components/ui/CashFlowChart';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import type { MonthSummaryItem } from '@/features/transactions/api/transactions';
import i18n from '@/core/i18n';

function bucketToChartPoint(b: MonthSummaryItem) {
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(b.year, b.month - 1, 1));
  return { month, revenue: b.revenue, expenses: b.expenses };
}

interface Props {
  buckets: MonthSummaryItem[] | undefined;
  loading?: boolean;
}

export function CashFlowCard({ buckets, loading }: Props) {
  const { t } = useTranslation();
  const chartData = (buckets ?? []).map(bucketToChartPoint);

  return (
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
      {loading ? (
        <Skeleton className="block w-full" height={180} />
      ) : chartData.length > 0 ? (
        <CashFlowChart data={chartData} height={180} />
      ) : (
        <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('home.noData')}
        </div>
      )}
    </div>
  );
}
