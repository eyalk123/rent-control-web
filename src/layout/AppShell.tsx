import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileBottomBar } from './MobileBottomBar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { FullPageLoader } from '@/shared/components/ui/LoadingSpinner';
import { AuthTokenSync } from '@/core/auth/AuthTokenSync';
import { TransactionFormDrawer } from '@/features/transactions/pages/TransactionFormDrawer';
import { AlertsPanelProvider, useAlertsPanel } from '@/features/alerts/AlertsPanelContext';
import { AlertsPanel } from '@/features/alerts/AlertsPanel';
import { ScanProvider } from '@/features/document-scan/ScanContext';
import { ScanSurfaces } from '@/features/document-scan/ScanSurfaces';
import { ChatPanelProvider } from '@/features/agent/PortfolioChatContext';
import { AnchorRegistryProvider } from '@/features/onboarding/AnchorRegistry';
import { TourControllerProvider, useTourStep } from '@/features/onboarding/TourController';
import { TourOverlay } from '@/features/onboarding/TourOverlay';
import { PortfolioChatPanel } from '@/features/agent/components/PortfolioChatPanel';

function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const segment = pathname.split('/')[1] ?? 'home';
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    document.title = `${label} — Rent Control`;
  }, [pathname]);
}

export function AppShell() {
  useDocumentTitle();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnchorRegistryProvider>
    <TourControllerProvider>
    <AlertsPanelProvider>
      <ChatPanelProvider>
        <ScanProvider>
        <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
          <AuthTokenSync />
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <TopBar
              onOpenPalette={() => setPaletteOpen(true)}
            />
            <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
              <Suspense fallback={<FullPageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
          <MobileBottomBar />
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <TransactionFormDrawer open={txDrawerOpen} onClose={() => setTxDrawerOpen(false)} />
          <AlertsPanel />
          <TourAlertsPanelDriver />
          <PortfolioChatPanel />
          {/* App-global scan drawers + floating "active scan" pill. */}
          <ScanSurfaces />
          {/* Onboarding. Last so its portal sits above the drawers it may point at. */}
          <TourOverlay />
        </div>
        </ScanProvider>
      </ChatPanelProvider>
    </AlertsPanelProvider>
    </TourControllerProvider>
    </AnchorRegistryProvider>
  );
}

/**
 * Opens the alerts panel for the one home-tour step that points inside it.
 *
 * The registry describes what to say and where to point; it owns no app state and cannot
 * open a panel. So the behaviour lives here, next to the panel it drives — the step is
 * marked `revealsAnchor`, meaning its element is expected to be absent until it is reached.
 *
 * It closes the panel again when the step passes, and only if the tour was what opened it:
 * a user who had the panel open already gets it back the way they left it.
 */
function TourAlertsPanelDriver() {
  const step = useTourStep('home');
  const { isOpen, openPanel, closePanel } = useAlertsPanel();
  const openedByTour = useRef(false);

  useEffect(() => {
    if (step === 'notifications') {
      if (!isOpen) {
        openedByTour.current = true;
        openPanel();
      }
      return;
    }
    if (openedByTour.current) {
      openedByTour.current = false;
      closePanel();
    }
  }, [step, isOpen, openPanel, closePanel]);

  return null;
}
