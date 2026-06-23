import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onAddRenter: () => void;
  onSkip: () => void;
}

/**
 * Shown after a property is created, prompting the user to add a renter for it.
 * Mirrors the mobile PropertyCreatedPrompt; styled after the shared ConfirmDialog.
 */
export function PropertyCreatedPrompt({ open, onAddRenter, onSkip }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onSkip]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onSkip} aria-hidden />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary)' }}
          >
            <CheckCircle size={24} />
          </div>
          <h3 className="mt-3 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('property.renterPromptTitle')}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('property.renterPromptMessage')}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAddRenter}
            className="h-11 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            {t('property.addRenterNow')}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="h-10 rounded-[9px] text-[13px] font-medium hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('property.maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
