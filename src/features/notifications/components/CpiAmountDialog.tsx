import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { FormInput } from '@/shared/components/form/FormInput';
import { currencySymbol, formatMoney } from '@/shared/utils/money';

/** Past this distance from the index figure the amount gets a second look, not a refusal. */
const FAR_FROM_INDEX = 0.05;

interface Props {
  open: boolean;
  loading?: boolean;
  renterName: string;
  /** The rent being paid now. */
  oldAmount: number;
  /** What the index linkage came to for the new year. */
  calculatedAmount: number;
  /** Already formatted for display. */
  effectiveDate: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

/** The round figures an owner usually agrees instead of the exact index result. */
function roundingOptions(calculated: number): number[] {
  const options = [Math.round(calculated / 50) * 50, Math.round(calculated / 100) * 100];
  return [...new Set(options)].filter((v) => v > 0 && v !== calculated);
}

/**
 * Edits the new rent from a confirmed CPI rent-change alert — usually to round it. One
 * field, prefilled with the index figure, with the nearby round numbers one click away.
 * The mobile app's `CpiAmountSheet` is the same thing as a bottom sheet.
 *
 * Warnings never block. The owner knows what was agreed with the tenant; the dialog only
 * points out an amount below today's rent or far from the index, in case it is a typo.
 */
export function CpiAmountDialog({
  open, loading, renterName, oldAmount, calculatedAmount, effectiveDate, onConfirm, onClose,
}: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');

  // A fresh start each time it opens, from the figure of the alert it opened for.
  useEffect(() => {
    if (open) setAmount(String(calculatedAmount));
  }, [open, calculatedAmount]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const value = Number(amount);
  const invalid = amount.trim() === '' || Number.isNaN(value) || value <= 0;
  const belowCurrent = !invalid && value < oldAmount;
  const farFromIndex =
    !invalid && calculatedAmount > 0 &&
    Math.abs(value - calculatedAmount) / calculatedAmount > FAR_FROM_INDEX;

  const submit = () => {
    if (invalid || loading) return;
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} aria-hidden />
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('notifications.cpiSheetTitle', { name: renterName })}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              <bdi>
                {t('notifications.cpiSheetCalculated', {
                  amount: formatMoney(calculatedAmount),
                  old: formatMoney(oldAmount),
                  date: effectiveDate,
                })}
              </bdi>
            </p>
          </div>
        </div>

        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}
        >
          <FormInput
            label={`${t('notifications.cpiSheetAmountLabel')} (${currencySymbol()})`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            name="cpi_agreed_amount"
          />
          <div className="flex flex-wrap gap-2">
            {roundingOptions(calculatedAmount).map((option) => {
              const selected = !invalid && value === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAmount(String(option))}
                  aria-pressed={selected}
                  className="rounded-full px-3 py-1 text-[13px] font-semibold transition-colors"
                  style={
                    selected
                      ? { background: 'var(--color-primary-fill)', color: 'white' }
                      : {
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-outline)',
                          color: 'var(--color-text-primary)',
                        }
                  }
                >
                  <bdi>{formatMoney(option)}</bdi>
                </button>
              );
            })}
          </div>
          {belowCurrent && (
            <p className="text-[13px]" style={{ color: 'var(--color-exp-fg)' }}>
              <bdi>{t('notifications.cpiSheetWarnBelowCurrent', { amount: formatMoney(oldAmount) })}</bdi>
            </p>
          )}
          {farFromIndex && (
            <p className="text-[13px]" style={{ color: 'var(--color-exp-fg)' }}>
              {t('notifications.cpiSheetWarnFarFromIndex')}
            </p>
          )}
          <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('notifications.cpiSheetHelper')}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{
                border: '1px solid var(--color-outline)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface)',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || invalid}
              className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-primary-fill)' }}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
