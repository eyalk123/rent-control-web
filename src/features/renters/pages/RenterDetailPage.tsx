import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RenterFormDrawer } from './RenterFormDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { useRenter } from '../queries';
import { useTransactions } from '@/features/transactions/queries';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { FullPageLoader } from '@/shared/components/ui/LoadingSpinner';
import { DetailNotFound } from '@/shared/components/ui/DetailNotFound';
import { DetailBackLink } from '@/shared/components/detail/DetailBackLink';
import { DetailTabBar } from '@/shared/components/detail/DetailTabBar';
import { RenterDetailHero } from '../components/RenterDetailHero';
import { LeaseInfoTab } from '../components/LeaseInfoTab';
import { RenterPropertyTab } from '../components/RenterPropertyTab';
import { RenterTransactionsTab } from '../components/RenterTransactionsTab';
import { getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';

type TabId = 'info' | 'property' | 'transactions';

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function RenterDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const renterId = Number(id);
  const [tab, setTab] = useState<TabId>('info');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);

  const { data: renter, isLoading, isError } = useRenter(renterId);
  const { data: txPages, isLoading: txLoading } = useTransactions({ renterId });
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const transactions = txPages?.pages.flat() ?? [];

  if (isLoading) return <FullPageLoader />;
  if (isError || !renter)
    return <DetailNotFound title={t('error.renterNotFound')} detail={t('error.notFoundDetail')} />;

  // Derive status
  const overdueIds = new Set((overdueList as OverdueRenter[]).map((r) => r.renter_id));
  const expiringIds = new Set((expiringList as ExpiringRenter[]).map((r) => r.renter_id));
  const status = overdueIds.has(renter.id) ? 'overdue' : expiringIds.has(renter.id) ? 'expiring' : 'active';

  const monthly = getRenterMonthlyRent(renter);
  const leaseEnd = getLeaseEndDate(renter);
  const days = daysUntil(leaseEnd);
  const totalPaid = transactions.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const paymentsCount = transactions.filter((tx) => tx.type === 'revenue').length;
  const heroBg = getPropertyColorBg(renter.id, 0.12);

  const pillTone = status === 'overdue' ? 'danger' : status === 'expiring' ? 'warning' : 'success';
  const pillLabel = status === 'overdue' ? t('renter.overdue') : status === 'expiring' ? t('renter.expiring') : t('renter.active');

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: t('renter.tabLeaseInfo') },
    { id: 'property', label: t('renter.tabProperty') },
    { id: 'transactions', label: txLoading ? t('renter.tabTransactions') : t('renter.tabTransactionsCount', { count: transactions.length }) },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="px-4 pt-6 lg:px-10" style={{ background: heroBg, borderBottom: '1px solid var(--color-outline)' }}>
        <DetailBackLink to="/renters" label={t('renter.allRenters')} />
        <RenterDetailHero
          renter={renter}
          pillTone={pillTone}
          pillLabel={pillLabel}
          monthly={monthly}
          days={days}
          leaseEnd={leaseEnd}
          totalPaid={totalPaid}
          paymentsCount={paymentsCount}
          statsLoading={txLoading}
          onEdit={() => setEditDrawerOpen(true)}
          onRecordPayment={() => setTxDrawerOpen(true)}
        />
        <DetailTabBar tabs={TABS} activeId={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div className="p-4 lg:p-10">
        {tab === 'info' && <LeaseInfoTab renter={renter} />}
        {tab === 'property' && <RenterPropertyTab renter={renter} />}
        {tab === 'transactions' && <RenterTransactionsTab transactions={transactions} />}
      </div>

      <RenterFormDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} renterId={renterId} />
      <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} initialType="revenue" />
    </div>
  );
}
