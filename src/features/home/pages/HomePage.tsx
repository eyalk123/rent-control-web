import { useNavigate } from 'react-router-dom';
import { useOverdueRenters, useExpiringRenters } from '../queries';
import { useTransactionSummary, useTransactions } from '@/features/transactions/queries';
import { useProperties } from '@/features/properties/queries';
import { HomeGreeting } from '../components/HomeGreeting';
import { NetProfitCard } from '../components/NetProfitCard';
import { CashFlowCard } from '../components/CashFlowCard';
import { QuickActions } from '../components/QuickActions';
import { NeedsAttentionSection } from '../components/NeedsAttentionSection';
import { PortfolioOccupancy } from '../components/PortfolioOccupancy';
import { RecentTransactions } from '../components/RecentTransactions';

export function HomePage() {
  const navigate = useNavigate();

  const { data: overdueRenters = [] } = useOverdueRenters();
  const { data: expiringRenters = [] } = useExpiringRenters(60);
  const { data: summary } = useTransactionSummary();
  const { data: properties = [] } = useProperties();
  const { data: recentTxPages } = useTransactions({});
  const recentTransactions = recentTxPages?.pages[0]?.slice(0, 5) ?? [];

  const currentBucket = summary?.six_month_buckets?.at(-1);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 pb-10 space-y-8">
      <HomeGreeting />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NetProfitCard currentBucket={currentBucket} />
        <CashFlowCard buckets={summary?.six_month_buckets} />
      </div>

      <QuickActions onNavigate={navigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeedsAttentionSection overdueRenters={overdueRenters} expiringRenters={expiringRenters} />
        <PortfolioOccupancy properties={properties} />
      </div>

      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
