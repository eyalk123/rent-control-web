import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { FormInput } from '@/shared/components/form/FormInput';
import { currencySymbol } from '@/shared/utils/money';
import { todayISO } from '@/shared/utils/dates';
import type { PropertyValuationInput } from '@/shared/types';

interface Props {
  open: boolean;
  loading?: boolean;
  onConfirm: (valuation: PropertyValuationInput) => void;
  onClose: () => void;
}

/**
 * One new entry for a property's value history: an amount and the date it is true as of.
 *
 * The same dialog behind the "+" in the property form and on the property page. The form
 * keeps the entry and sends it with the save; the page posts it straight away.
 */
export function PropertyValueDialog({ open, loading, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO);
  const [touched, setTouched] = useState(false);

  // Reset on each open so a cancelled attempt doesn't pre-fill the next one.
  useEffect(() => {
    if (!open) return;
    setAmount('');
    setDate(todayISO());
    setTouched(false);
  }, [open]);

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
  const amountInvalid = amount.trim() === '' || Number.isNaN(value) || value <= 0;
  // The server refuses a future date too: it would read as the current value until that day.
  const dateInvalid = !date || date > todayISO();

  const submit = () => {
    setTouched(true);
    if (amountInvalid || dateInvalid) return;
    onConfirm({ value, valued_on: date });
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
              {t('property.valueDialogTitle')}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('property.valueDialogNote')}
            </p>
          </div>
        </div>

        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}
        >
          <FormInput
            label={`${t('property.valueAmount')} (${currencySymbol()})`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={touched && amountInvalid ? t('property.valueMustBePositive') : undefined}
            name="valuation_value"
          />
          <FormDateInput
            label={t('property.valueDate')}
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            error={touched && dateInvalid ? t('property.valueDateFuture') : undefined}
          />
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
              disabled={loading}
              className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-primary-fill)' }}
            >
              {t('property.addValue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
