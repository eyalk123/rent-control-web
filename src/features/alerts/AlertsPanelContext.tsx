import { createContext, useContext, useState, type ReactNode } from 'react';

interface AlertsPanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  hasAlerts: boolean;
  setHasAlerts: (v: boolean) => void;
}

const AlertsPanelContext = createContext<AlertsPanelContextValue | null>(null);

export function AlertsPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Reflects unread notifications in the feed; the dot on the bell uses it.
  const [hasAlerts, setHasAlerts] = useState(false);

  return (
    <AlertsPanelContext.Provider value={{
      isOpen,
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      hasAlerts,
      setHasAlerts,
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
