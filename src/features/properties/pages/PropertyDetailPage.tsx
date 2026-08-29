import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PropertyFormDrawer } from './PropertyFormDrawer';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { RenterFormDrawer } from '@/features/renters/pages/RenterFormDrawer';
import { useScanSession } from '@/features/document-scan/ScanContext';
import type { MappedExtraction, MappedRenter } from '@/features/document-scan/utils/mapExtraction';
import { useProperty, useDeleteProperty } from '../queries';
import { useToast } from '@/shared/components/ui/Toast';
import { useAllTransactions } from '@/features/transactions/queries';
import { FullPageLoader } from '@/shared/components/ui/LoadingSpinner';
import { DetailNotFound } from '@/shared/components/ui/DetailNotFound';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DetailBackLink } from '@/shared/components/detail/DetailBackLink';
import { DetailTabBar } from '@/shared/components/detail/DetailTabBar';
import { useDetailBackTarget } from '@/shared/components/detail/useDetailBackTarget';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour, useTourStep } from '@/features/onboarding/TourController';
import { PropertyDetailHero } from '../components/PropertyDetailHero';
import { PropertyDetailsTab } from '../components/PropertyDetailsTab';
import { PropertyRentersTab } from '../components/PropertyRentersTab';
import { PropertyTransactionsTab } from '../components/PropertyTransactionsTab';
import { PropertyDocumentsTab } from '../components/PropertyDocumentsTab';
import { getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getTotalCurrentMonthlyRent } from '@/shared/types';
import { effectiveDate } from '@/shared/utils/txDate';

type TabId = 'info' | 'renters' | 'transactions' | 'documents';
const TAB_IDS: TabId[] = ['info', 'renters', 'transactions', 'documents'];

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const propertyId = Number(id);
  const { mutateAsync: deleteProperty, isPending: isDeleting } = useDeleteProperty();
  const { showToast } = useToast();
  // When opened from a renter's property tab, that origin is carried on the
  // navigation state so the back link returns there (and names it) instead of
  // the generic properties list.
  const { backState, tab, setTab, location } = useDetailBackTarget(TAB_IDS, 'info');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);
  const [renterDrawerOpen, setRenterDrawerOpen] = useState(false);
  // Document-scan (renter target) for THIS property — property is fixed, so no matching.
  // `renters` is the finalised per-renter queue (joint-rent split applied on the summary).
  // Populated from the app-global scan session once the user continues out of the summary.
  // Drives the property form's prefill; NOT cleared when that drawer closes, so the renter
  // queue survives into the renter form it chains into (see PropertiesListPage).
  const [scan, setScan] = useState<{ logId: number; mapped: MappedExtraction; renters: MappedRenter[]; file: File } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { begin: beginScan, view: scanView, session: scanSession, consume: consumeScan } = useScanSession();
  useTour('property-detail');
  const tabsAnchorRef = useTourAnchor(ANCHORS.propertyDetailTabs);
  const panelAnchorRef = useTourAnchor(ANCHORS.propertyDetailPanel);
  /**
   * The tab the tour is talking about, or the user's own when no tour is running.
   *
   * Derived, never written. `setTab` puts the tab in the query string, so driving the tour
   * through it would rewrite the URL, poison the back button and need undoing afterwards.
   * This overrides only what is *rendered* (and the tab bar's own highlight, so the control
   * is visibly doing it); `useTourStep` goes null the moment the tour ends, which puts the
   * user's tab back with no cleanup at all. Same arrangement as PropertiesListPage's
   * card/table demonstration.
   */
  const tourStep = useTourStep('property-detail');
  const shownTab: TabId =
    tourStep === 'renters' ? 'renters'
    : tourStep === 'payments' ? 'transactions'
    : tourStep === 'documents' ? 'documents'
    : tourStep === 'overview' || tourStep === 'stats' || tourStep === 'tabs' ? 'info'
    : tab;

  // Pick up the scan handoff and open THIS property's form with the lease overlaid — blank
  // fields filled, differing ones raised as keep/replace conflicts — before it chains into the
  // renter form(s). The lease describes the property too, so a renter-target scan reviews it
  // rather than dropping it (same review step as a property-target scan).
  useEffect(() => {
    if (scanView === 'handoff' && scanSession?.originPath === location.pathname) {
      const result = consumeScan();
      if (result) {
        setScan({ logId: result.logId, mapped: result.mapped, renters: result.renters, file: result.file });
        setEditDrawerOpen(true);
      }
    }
  }, [scanView, scanSession, location.pathname, consumeScan]);

  const { data: property, isLoading, isError } = useProperty(propertyId);
  // The payment matrix needs the whole history, not the first page — see RenterDetailPage.
  const { data: transactions = [], isLoading: txLoading } = useAllTransactions({ propertyId });

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
  const monthlyRent = property.renters?.length ? getTotalCurrentMonthlyRent(property.renters) : null;
  // Scoped to the current calendar year and bucketed by effective date, matching the renter
  // page and the payment grid below. These read as all-time before, which put an all-time
  // figure next to a per-year grid.
  const currentYear = new Date().getFullYear();
  const thisYearTx = transactions.filter((tx) => effectiveDate(tx).slice(0, 4) === String(currentYear));
  const revTotal = thisYearTx.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
  const expTotal = thisYearTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const heroBg = getPropertyColorBg(property.id, 0.12);
  const rentersCount = property.renters?.length ?? 0;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: t('property.tabDetails') },
    { id: 'renters', label: t('property.tabRentersCount', { count: rentersCount }) },
    { id: 'transactions', label: t('property.tabTransactions') },
    { id: 'documents', label: t('property.tabDocuments') },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="px-4 pt-6 lg:px-10" style={{ background: heroBg, borderBottom: '1px solid var(--color-outline)' }}>
        <DetailBackLink
          to={backState?.backTo ?? '/properties'}
          label={
            backState?.backLabel
              ? t('property.backToRenter', { name: backState.backLabel })
              : t('property.allProperties')
          }
        />
        <PropertyDetailHero
          property={property}
          monthlyRent={monthlyRent}
          revTotal={revTotal}
          expTotal={expTotal}
          year={String(currentYear)}
          renterName={activeRenter ? `${activeRenter.first_name} ${activeRenter.last_name}` : null}
          rentersCount={rentersCount}
          statsLoading={txLoading}
          onEdit={() => { setScan(null); setEditDrawerOpen(true); }}
          onAddTransaction={() => setTxDrawerOpen(true)}
          onDelete={() => setConfirmDeleteOpen(true)}
        />
        <div ref={tabsAnchorRef}>
          <DetailTabBar tabs={TABS} activeId={shownTab} onChange={setTab} />
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 lg:p-10" ref={panelAnchorRef}>
        {shownTab === 'info' && <PropertyDetailsTab property={property} />}
        {shownTab === 'renters' && (
          <PropertyRentersTab
            property={property}
            onAddRenter={() => { setScan(null); setRenterDrawerOpen(true); }}
            onScanRenter={() => beginScan({ target: 'renter', propertyId, originPath: location.pathname })}
          />
        )}
        {shownTab === 'transactions' && <PropertyTransactionsTab property={property} transactions={transactions} />}
        {shownTab === 'documents' && <PropertyDocumentsTab property={property} />}
      </div>

      <PropertyFormDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        propertyId={propertyId}
        logId={scan?.logId}
        prefill={scan?.mapped.propertyPrefill}
        reviewItems={scan?.mapped.propertyReview}
        provenance={scan?.mapped.propertyProvenance}
        addressEvidence={scan?.mapped.addressEvidence}
        renterQueue={scan?.renters}
        renterContractFile={scan?.file ?? null}
      />
      <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} initialPropertyId={propertyId} />
      {/* Manual "Add renter" only — a scanned lease's renters are chained from the property
          form above, which now runs first for scans too. */}
      <RenterFormDrawer
        open={renterDrawerOpen}
        onClose={() => setRenterDrawerOpen(false)}
        initialPropertyId={propertyId}
      />
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
