import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Intercepts "soft" dismissals (scrim click, Escape, X button) so the parent can,
   * e.g., confirm discarding unsaved changes. When omitted, soft dismissals call
   * `onClose` directly (unchanged behavior). `onClose` is still the actual close.
   */
  onRequestClose?: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, onRequestClose, title, children, footer, width = 560 }: DrawerProps) {
  const { t } = useTranslation();
  const requestClose = onRequestClose ?? onClose;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Track the visual viewport so the panel (and its pinned footer) stays above the
  // on-screen keyboard / browser chrome on mobile. Falls back to the `h-dvh` class.
  const [vv, setVv] = useState<{ height: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, requestClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const v = window.visualViewport;
    if (!v) return;
    const update = () => setVv({ height: v.height, top: v.offsetTop });
    update();
    v.addEventListener('resize', update);
    v.addEventListener('scroll', update);
    return () => {
      v.removeEventListener('resize', update);
      v.removeEventListener('scroll', update);
      setVv(null);
    };
  }, [open]);

  // Focus management: focus the panel on open, trap Tab within it, and restore
  // focus to the previously focused element on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];

    (focusables()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); panel?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', onKeyDown);
    return () => {
      panel?.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const isRtl = document.documentElement.getAttribute('dir') === 'rtl';
  const slideIn = isRtl ? 'slideInLeft' : 'slideInRight';

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim — full screen */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'fadeIn 0.18s ease backwards' }}
        onClick={requestClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute flex flex-col bg-[var(--color-surface)] shadow-2xl outline-none w-full sm:w-[var(--drawer-w)] sm:max-w-full ${isRtl ? 'left-0' : 'right-0'}`}
        style={{
          ['--drawer-w' as string]: `${width}px`,
          // Explicit height (not a Tailwind class) so the panel is always bounded and the
          // pinned footer stays on-screen. `vv` tracks the keyboard; `100dvh` is the fallback.
          top: vv ? vv.top : 0,
          height: vv ? vv.height : '100dvh',
          animation: `${slideIn} 0.22s cubic-bezier(.2,.7,.2,1) backwards`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-outline)] shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('a11y.close')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--color-outline)] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
