import { useScanSession } from './ScanContext';
import { DocumentScanDrawer } from './pages/DocumentScanDrawer';
import { ScanSummaryDrawer } from './pages/ScanSummaryDrawer';
import { ScanPill } from './ScanPill';

/**
 * The app-global scan surfaces: the file-picker/extraction drawer, the post-scan summary,
 * and the floating pill they minimize to. Mounted once in AppShell so a scan survives page
 * navigation and drawer dismissal. Individual pages only trigger `begin()` and pick up the
 * handoff result; they no longer render these drawers themselves.
 */
export function ScanSurfaces() {
  const { session, view, dismissSummary, continueToForm } = useScanSession();
  return (
    <>
      <DocumentScanDrawer />
      {session?.result && (
        <ScanSummaryDrawer
          open={view === 'summary'}
          onClose={dismissSummary}
          mapped={session.result.mapped}
          onContinue={continueToForm}
        />
      )}
      <ScanPill />
    </>
  );
}
