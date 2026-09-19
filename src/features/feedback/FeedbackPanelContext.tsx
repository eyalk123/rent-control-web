import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Opens the feedback drawer from anywhere.
 *
 * The drawer used to be local state on the Settings page, which meant the only
 * way to report a bug was to first navigate away from the bug. It is now mounted
 * once in `AppShell`, next to the alerts and chat panels, and opened through this
 * context — so the TopBar button and the Settings row drive the same instance
 * rather than two drawers that could both be open.
 */
interface FeedbackPanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const FeedbackPanelContext = createContext<FeedbackPanelContextValue | null>(null);

export function FeedbackPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FeedbackPanelContext.Provider
      value={{
        isOpen,
        openPanel: () => setIsOpen(true),
        closePanel: () => setIsOpen(false),
      }}
    >
      {children}
    </FeedbackPanelContext.Provider>
  );
}

export function useFeedbackPanel() {
  const ctx = useContext(FeedbackPanelContext);
  if (!ctx) throw new Error('useFeedbackPanel must be used within FeedbackPanelProvider');
  return ctx;
}
