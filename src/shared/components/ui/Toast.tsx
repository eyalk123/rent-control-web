import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const variantClass: Record<ToastVariant, string> = {
    default: 'bg-[var(--color-surface)] border-[var(--color-outline)] text-[var(--color-text-primary)]',
    success: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]',
    error: 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-[var(--color-error)]',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            open
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-md text-sm font-medium ${variantClass[toast.variant]}`}
          >
            <RadixToast.Description>{toast.message}</RadixToast.Description>
            <RadixToast.Close asChild>
              <button className="shrink-0 opacity-70 hover:opacity-100" aria-label={t('a11y.close')}>
                <X size={14} aria-hidden="true" />
              </button>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-24 lg:bottom-6 end-4 z-[100] flex max-w-xs flex-col gap-2" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
