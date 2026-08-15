import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RenterFormDrawer } from './RenterFormDrawer';
import { LeaseExtensionDrawer } from '../components/LeaseExtensionDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { useRenter, useDeleteRenter } from '../queries';
import { useToast } from '@/shared/components/ui/Toast';
import { useTransactions } from '@/features/transactions/queries';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import type { OverdueRenter, ExpiringRenter } from '@/features/home/api/homeApi';
import { FullPageLoader } from '@/shared/components/ui/LoadingSpinner';
import { DetailNotFound } from '@/shared/components/ui/DetailNotFound';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DetailBackLink } from '@/shared/components/detail/DetailBackLink';
import { DetailTabBar } from '@/shared/components/detail/DetailTabBar';
import { useDetailBackTarget } from '@/shared/components/detail/useDetailBackTarget';
import { RenterDetailHero } from '../components/RenterDetailHero';
import { LeaseInfoTab } from '../components/LeaseInfoTab';
import { RenterPropertyTab } from '../components/RenterPropertyTab';
import { RenterTransactionsTab } from '../components/RenterTransactionsTab';
import { getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getCurrentMonthlyRent, getLeaseEndDate } from '@/shared/types';

type TabId = 'info' | 'property' | 'transactions';
const TAB_IDS: TabId[] = ['info', 'property', 'transactions'];

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function RenterDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const renterId = Number(id);
  const { mutateAsync: deleteRenter, isPending: isDeleting } = useDeleteRenter();
  const { showToast } = useToast();
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [extendDrawerOpen, setExtendDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // When opened from a property's renter list, that origin is carried on the
  // navigation state so the back link returns there (and names it) instead of
  // the generic renters list.
  const { backState, tab, setTab, searchParams, setSearchParams, location } =
    useDetailBackTarget(TAB_IDS, 'info');
  const backTo = backState?.backTo ?? '/renters';
  const backLabel = backState?.backLabel
    ? t('renter.backToProperty', { name: backState.backLabel })
    : t('renter.allRenters');

  // Deep-link from the "Update lease" notification action (?extend=1) opens the
  // extension drawer directly, then clears the param so a refresh won't re-open it.
  useEffect(() => {
    if (searchParams.get('extend') === '1') {
      setExtendDrawerOpen(true);
      searchParams.delete('extend');
      // Re-send state: a state-less replace would drop the back-link origin.
      setSearchParams(searchParams, { replace: true, state: location.state });
    }
  }, [searchParams, setSearchParams, location.state]);

  const { data: renter, isLoading, isError } = useRenter(renterId);
  const { data: txPages, isLoading: txLoading } = useTransactions({ renterId });
  const { data: overdueList = [] } = useOverdueRenters();
  const { data: expiringList = [] } = useExpiringRenters();

  const transactions = txPages?.pages.flat() ?? [];

  const handleDelete = async () => {
    try {
      await deleteRenter(renterId);
      showToast(t('renter.deleteSuccess'), 'success');
      navigate('/renters', { replace: true });
    } catch {
      setConfirmDeleteOpen(false);
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  if (isLoading) return <FullPageLoader />;
  if (isError || !renter)
    return <DetailNotFound title={t('error.renterNotFound')} detail={t('error.notFoundDetail')} />;

  // Derive status
  const overdueIds = new Set((overdueList as OverdueRenter[]).map((r) => r.renter_id));
  const expiringIds = new Set((expiringList as ExpiringRenter[]).map((r) => r.renter_id));
  const status = overdueIds.has(renter.id) ? 'overdue' : expiringIds.has(renter.id) ? 'expiring' : 'active';

  const monthly = getCurrentMonthlyRent(renter);
  const leaseEnd = getLeaseEndDate(renter);
  const days = daysUntil(leaseEnd);
  // Hero totals cover the current calendar year only, by payment date.
  const currentYear = new Date().getFullYear();
  const thisYearTx = transactions.filter((tx) => tx.date_of_payment?.slice(0, 4) === String(currentYear));
  const totalRevenue = thisYearTx.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = thisYearTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
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
        <DetailBackLink to={backTo} label={backLabel} />
        <RenterDetailHero
          renter={renter}
          pillTone={pillTone}
          pillLabel={pillLabel}
          monthly={monthly}
          days={days}
          leaseEnd={leaseEnd}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          year={String(currentYear)}
          statsLoading={txLoading}
          onEdit={() => setEditDrawerOpen(true)}
          onExtendLease={() => setExtendDrawerOpen(true)}
          onRecordPayment={() => setTxDrawerOpen(true)}
          onDelete={() => setConfirmDeleteOpen(true)}
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
      <LeaseExtensionDrawer open={extendDrawerOpen} onClose={() => setExtendDrawerOpen(false)} renter={renter} />
      <TransactionFormDrawer
        open={txDrawerOpen}
        onClose={() => setTxDrawerOpen(false)}
        initialType="revenue"
        initialPropertyId={renter.property_id ?? undefined}
        initialRenterId={renter.id}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('renter.deleteConfirmTitle')}
        message={t('renter.deleteConfirm')}
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
