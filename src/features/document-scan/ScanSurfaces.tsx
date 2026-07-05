import { useMemo } from 'react';
import { useProperties } from '@/features/properties/queries';
import { useRenters } from '@/features/renters/queries';
import { useScanSession } from './ScanContext';
import { DocumentScanDrawer } from './pages/DocumentScanDrawer';
import { ScanSummaryDrawer } from './pages/ScanSummaryDrawer';
import { ScanPill } from './ScanPill';
import { matchProperty, findDuplicateRenterIndices } from './utils/matchProperty';

/**
 * The app-global scan surfaces: the file-picker/extraction drawer, the post-scan summary,
 * and the floating pill they minimize to. Mounted once in AppShell so a scan survives page
 * navigation and drawer dismissal. Individual pages only trigger `begin()` and pick up the
 * handoff result; they no longer render these drawers themselves.
 */
export function ScanSurfaces() {
  const { session, view, dismissSummary, continueToForm } = useScanSession();
  const { data: properties = [] } = useProperties();
  const { data: renters = [] } = useRenters();

  // Duplicate detection surfaced on the summary: does the scanned property match an existing
  // one, and (only if so) which scanned renters already exist on that property?
  const mapped = session?.result?.mapped;
  const { propertyMatched, duplicateRenterIdx } = useMemo(() => {
    if (!mapped) return { propertyMatched: false, duplicateRenterIdx: new Set<number>() };
    const m = matchProperty(mapped.propertyPrefill, properties);
    return {
      propertyMatched: m.status === 'matched',
      duplicateRenterIdx: findDuplicateRenterIndices(mapped.renters, m.propertyId, renters),
    };
  }, [mapped, properties, renters]);

  return (
    <>
      <DocumentScanDrawer />
      {session?.result && (
        <ScanSummaryDrawer
          open={view === 'summary'}
          onClose={dismissSummary}
          mapped={session.result.mapped}
          propertyMatched={propertyMatched}
          duplicateRenterIdx={duplicateRenterIdx}
          onContinue={continueToForm}
        />
      )}
      <ScanPill />
    </>
  );
}
