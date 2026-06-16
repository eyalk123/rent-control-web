import { useNavigate } from 'react-router-dom';
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

  const { data: summary, isLoading: summaryLoading } = useTransactionSummary();
  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: recentTxPages, isLoading: recentLoading } = useTransactions({});
  const recentTransactions = recentTxPages?.pages[0]?.slice(0, 5) ?? [];

  const currentBucket = summary?.six_month_buckets?.at(-1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 pb-10 space-y-8">
      <HomeGreeting />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NetProfitCard currentBucket={currentBucket} loading={summaryLoading} />
        <CashFlowCard buckets={summary?.six_month_buckets} loading={summaryLoading} />
      </div>

      <QuickActions onNavigate={navigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeedsAttentionSection />
        <PortfolioOccupancy properties={properties} loading={propsLoading} />
      </div>

      <RecentTransactions transactions={recentTransactions} loading={recentLoading} />
    </div>
  );
}
