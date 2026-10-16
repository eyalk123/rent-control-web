import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';
import { formatDate, formatMoney } from '@/shared/utils/money';
import { useDeletePropertyValuation, usePropertyValuations } from '../queries';
import { PropertyValueChart } from './PropertyValueChart';

interface Props {
  open: boolean;
  propertyId: number;
  /** Drawn as the chart's first point when both are known. */
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  onClose: () => void;
}

/** Every value recorded for the property, newest first, each removable. */
export function PropertyValueHistoryDialog({ open, propertyId, purchasePrice, purchaseDate, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: valuations = [], isLoading } = usePropertyValuations(propertyId, { enabled: open });
  const deleteMutation = useDeletePropertyValuation(propertyId);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingDelete == null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pendingDelete, onClose]);

  if (!open) return null;

  const confirmDelete = async () => {
    if (pendingDelete == null) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete);
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
    setPendingDelete(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <div className="flex items-center gap-3 px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
            <History size={18} style={{ color: 'var(--color-primary)' }} aria-hidden />
            <h3 className="flex-1 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('property.valueHistory')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('a11y.close')}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-input-bg)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto">
            {!isLoading && (
              <PropertyValueChart valuations={valuations} purchasePrice={purchasePrice} purchaseDate={purchaseDate} />
            )}
            {isLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : valuations.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('property.noValueHistory')}
              </p>
            ) : (
              <ul>
                {valuations.map((v, i) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-3 px-6 py-3"
                    style={{ borderBottom: i === valuations.length - 1 ? 'none' : '1px solid var(--color-outline)' }}
                  >
                    <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(v.valued_on)}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(v.value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(v.id)}
                      aria-label={t('property.deleteValue')}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-input-bg)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* After the dialog, so at the same z-index it paints on top of it. */}
      <ConfirmDialog
        open={pendingDelete != null}
        title={t('property.deleteValueConfirm')}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
