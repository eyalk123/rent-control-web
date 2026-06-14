import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { RenterFormDrawer } from '@/features/renters/pages/RenterFormDrawer';
import { useProperty, useDeleteProperty } from '../queries';
import { useToast } from '@/shared/components/ui/Toast';
import { useTransactions } from '@/features/transactions/queries';
import { FullPageLoader } from '@/shared/components/ui/LoadingSpinner';
import { DetailNotFound } from '@/shared/components/ui/DetailNotFound';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DetailBackLink } from '@/shared/components/detail/DetailBackLink';
import { DetailTabBar } from '@/shared/components/detail/DetailTabBar';
import { PropertyDetailHero } from '../components/PropertyDetailHero';
import { PropertyDetailsTab } from '../components/PropertyDetailsTab';
import { PropertyRentersTab } from '../components/PropertyRentersTab';
import { PropertyTransactionsTab } from '../components/PropertyTransactionsTab';
import { PropertyDocumentsTab } from '../components/PropertyDocumentsTab';
import { getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getTotalMonthlyRent } from '@/shared/types';

type TabId = 'info' | 'renters' | 'transactions' | 'documents';

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const propertyId = Number(id);
  const { mutateAsync: deleteProperty, isPending: isDeleting } = useDeleteProperty();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('info');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);
  const [renterDrawerOpen, setRenterDrawerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: property, isLoading, isError } = useProperty(propertyId);
  const { data: txPages, isLoading: txLoading } = useTransactions({ propertyId });
  const transactions = txPages?.pages.flat() ?? [];

  const handleDelete = async () => {
    try {
      await deleteProperty(propertyId);
      showToast(t('property.deleteSuccess'), 'success');
      navigate('/properties', { replace: true });
    } catch {
      setConfirmDeleteOpen(false);
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  if (isLoading) return <FullPageLoader />;
  if (isError || !property)
    return <DetailNotFound title={t('error.propertyNotFound')} detail={t('error.notFoundDetail')} />;

  const activeRenter = property.renters?.[0];
  const monthlyRent = property.renters?.length ? getTotalMonthlyRent(property.renters) : null;
  const revTotal = transactions.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const expTotal = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const heroBg = getPropertyColorBg(property.id, 0.12);
  const rentersCount = property.renters?.length ?? 0;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: t('property.tabDetails') },
    { id: 'renters', label: t('property.tabRentersCount', { count: rentersCount }) },
    { id: 'transactions', label: txLoading ? t('property.tabTransactions') : t('property.tabTransactionsCount', { count: transactions.length }) },
    { id: 'documents', label: t('property.tabDocuments') },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="px-4 pt-6 lg:px-10" style={{ background: heroBg, borderBottom: '1px solid var(--color-outline)' }}>
        <DetailBackLink to="/properties" label={t('property.allProperties')} />
        <PropertyDetailHero
          property={property}
          monthlyRent={monthlyRent}
          revTotal={revTotal}
          expTotal={expTotal}
          renterName={activeRenter ? `${activeRenter.first_name} ${activeRenter.last_name}` : null}
          rentersCount={rentersCount}
          statsLoading={txLoading}
          onEdit={() => setEditDrawerOpen(true)}
          onAddTransaction={() => setTxDrawerOpen(true)}
          onDelete={() => setConfirmDeleteOpen(true)}
        />
        <DetailTabBar tabs={TABS} activeId={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div className="p-4 lg:p-10">
        {tab === 'info' && <PropertyDetailsTab property={property} />}
        {tab === 'renters' && <PropertyRentersTab property={property} onAddRenter={() => setRenterDrawerOpen(true)} />}
        {tab === 'transactions' && <PropertyTransactionsTab transactions={transactions} />}
        {tab === 'documents' && <PropertyDocumentsTab property={property} />}
      </div>

      <PropertyFormDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} propertyId={propertyId} />
      <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} initialPropertyId={propertyId} />
      <RenterFormDrawer open={renterDrawerOpen} onClose={() => setRenterDrawerOpen(false)} initialPropertyId={propertyId} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('property.deleteConfirmTitle')}
        message={t('property.deleteConfirm')}
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
