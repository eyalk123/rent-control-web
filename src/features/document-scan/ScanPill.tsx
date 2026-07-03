import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { useScanSession } from './ScanContext';

/**
 * Floating "active scan" pill — the minimized representation of a scan session (Wolt's
 * order-in-progress pill). Appears when the scan/summary drawer is dismissed while a scan is
 * running or its result is waiting, so the work is never lost. Tapping restores the drawer;
 * the ✕ cancels the session (and aborts an in-flight request).
 */
export function ScanPill() {
  const { t } = useTranslation();
  const { session, view, restore, cancel } = useScanSession();

  if (view !== 'minimized' || !session) return null;

  const { status } = session;
  const label =
    status === 'ready' ? t('documentScan.pill.ready')
    : status === 'error' ? t('documentScan.pill.error')
    : t('documentScan.pill.scanning');

  // Ready = inviting success; error = attention; scanning = calm brand navy.
  const bg =
    status === 'ready' ? 'var(--color-success)'
    : status === 'error' ? 'var(--color-error)'
    : 'var(--color-primary)';

  const icon =
    status === 'ready' ? <Check size={16} aria-hidden="true" />
    : status === 'error' ? <AlertTriangle size={16} aria-hidden="true" />
    : <Loader2 size={16} className="animate-spin" aria-hidden="true" />;

  return (
    // Anchored bottom-`end` (RTL-aware) and above the mobile bottom bar; below toasts (z-100).
    <div className="fixed bottom-24 lg:bottom-6 end-4 z-[90]">
      <div
        className="flex items-center gap-2 rounded-full ps-4 pe-2 py-2 text-white shadow-lg"
        style={{ background: bg, animation: 'fadeIn 0.2s ease backwards' }}
      >
        <button
          type="button"
          onClick={restore}
          className="flex items-center gap-2 text-[13px] font-semibold"
          aria-label={t('documentScan.pill.restore')}
        >
          {icon}
          <span>{label}</span>
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label={t('documentScan.pill.cancel')}
          className="flex h-6 w-6 items-center justify-center rounded-full opacity-80 hover:opacity-100 hover:bg-white/20 transition"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
