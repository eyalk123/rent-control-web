import { createContext, useContext, useState, type ReactNode } from 'react';

interface AlertsPanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  hasAlerts: boolean;
  setHasAlerts: (v: boolean) => void;
  dismissedKeys: Set<string>;
  dismiss: (key: string) => void;
}

const AlertsPanelContext = createContext<AlertsPanelContextValue | null>(null);

export function AlertsPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAlerts, setHasAlerts] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  return (
    <AlertsPanelContext.Provider value={{
      isOpen,
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      hasAlerts,
      setHasAlerts,
      dismissedKeys,
      dismiss: (key: string) => setDismissedKeys((prev) => new Set(prev).add(key)),
    }}>
      {children}
    </AlertsPanelContext.Provider>
  );
}

export function useAlertsPanel() {
  const ctx = useContext(AlertsPanelContext);
  if (!ctx) throw new Error('useAlertsPanel must be used within AlertsPanelProvider');
  return ctx;
}
