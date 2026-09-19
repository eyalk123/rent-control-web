import { FeedbackDrawer } from './pages/FeedbackDrawer';
import { useFeedbackPanel } from './FeedbackPanelContext';

/**
 * The one mounted feedback drawer, rendered app-globally by `AppShell` alongside
 * `AlertsPanel` and `PortfolioChatPanel`. Keeping the drawer itself props-driven
 * means it stays testable on its own; this is the thin piece that wires it to the
 * context.
 */
export function FeedbackSurface() {
  const { isOpen, closePanel } = useFeedbackPanel();
  return <FeedbackDrawer open={isOpen} onClose={closePanel} />;
}
