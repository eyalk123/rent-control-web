import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  /** Confirm button label. Defaults to common.delete. */
  confirmLabel?: string;
  /** Visual tone of the confirm button. Defaults to 'danger'. */
  tone?: 'danger' | 'primary';
  /** Disables the confirm button and shows a pending state. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'danger', loading, onConfirm, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const confirmBg = tone === 'danger' ? 'var(--color-error)' : 'var(--color-primary)';
  const iconBg = tone === 'danger' ? 'var(--color-error)' : 'var(--color-primary)';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} aria-hidden />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${iconBg} 14%, transparent)`, color: iconBg }}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-[9px] text-[13px] font-medium disabled:opacity-50"
            style={{
              border: '1px solid var(--color-outline)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-surface)',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: confirmBg }}
          >
            {loading ? '...' : (confirmLabel ?? t('common.delete'))}
          </button>
        </div>
      </div>
    </div>
  );
}
