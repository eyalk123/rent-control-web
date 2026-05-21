import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, title, children, footer, width = 560 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Scrim */}
      <div
        className="flex-1 bg-black/40"
        style={{ animation: 'fadeIn 0.18s ease' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="flex flex-col h-full bg-[var(--color-surface)] shadow-2xl"
        style={{
          width: Math.min(width, window.innerWidth),
          animation: 'slideInRight 0.22s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-outline)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--color-outline)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
