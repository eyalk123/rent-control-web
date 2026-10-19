import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Landmark, Trash2, X } from 'lucide-react';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { FormInput } from '@/shared/components/form/FormInput';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { currencySymbol, formatDate, formatMoney } from '@/shared/utils/money';
import { todayISO } from '@/shared/utils/dates';
import type { Mortgage, MortgagePaymentInput } from '@/shared/types';

function useEscape(open: boolean, enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, enabled, onClose]);
}

/** The modal frame the property-value dialogs use, with the mortgage icon. */
export function DialogShell({
  title,
  note,
  loading,
  onClose,
  children,
}: {
  title: string;
  note?: string;
  loading?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
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
            <Landmark size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
            {note && (
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{note}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogButtons({ submitLabel, loading, onClose }: { submitLabel: string; loading?: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="flex-1 h-10 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-50"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--color-primary-fill)' }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

const amountValid = (raw: string) => raw.trim() !== '' && !Number.isNaN(Number(raw)) && Number(raw) > 0;

interface PaymentDialogProps {
  open: boolean;
  loading?: boolean;
  onConfirm: (data: MortgagePaymentInput) => void;
  onClose: () => void;
}

/** A new monthly amount from a date on — what the owner does after a rate change. */
export function MortgagePaymentDialog({ open, loading, onConfirm, onClose }: PaymentDialogProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setDate(todayISO());
    setTouched(false);
  }, [open]);

  useEscape(open, !loading, onClose);
  if (!open) return null;

  const amountInvalid = !amountValid(amount);
  const submit = () => {
    setTouched(true);
    // Any date: a change the bank has announced for next month is worth recording now.
    if (amountInvalid || !date) return;
    onConfirm({ amount: Number(amount), effective_from: date });
  };

  return (
    <DialogShell title={t('mortgage.newPaymentTitle')} note={t('mortgage.newPaymentNote')} loading={loading} onClose={onClose}>
      <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}>
        <FormInput
          label={`${t('mortgage.monthlyPayment')} (${currencySymbol()})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={touched && amountInvalid ? t('mortgage.amountInvalid') : undefined}
          name="mortgage_payment_amount"
        />
        <FormDateInput label={t('mortgage.paymentFrom')} value={date} onChange={(e) => setDate(e.target.value)} />
        <DialogButtons submitLabel={t('mortgage.newPayment')} loading={loading} onClose={onClose} />
      </form>
    </DialogShell>
  );
}

interface HistoryDialogProps {
  mortgage: Mortgage | null;
  deleting?: boolean;
  onDelete: (paymentId: number) => Promise<void>;
  onClose: () => void;
}

/** Every amount the mortgage has had, newest first. Each is removable but the last. */
export function MortgagePaymentHistoryDialog({ mortgage, deleting, onDelete, onClose }: HistoryDialogProps) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  useEscape(!!mortgage, pendingDelete == null, onClose);
  if (!mortgage) return null;
  const only = mortgage.payments.length <= 1;

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
            <h3 className="flex-1 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('mortgage.history')}</h3>
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
          <ul className="overflow-y-auto">
            {mortgage.payments.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-6 py-3"
                style={{ borderBottom: i === mortgage.payments.length - 1 ? 'none' : '1px solid var(--color-outline)' }}
              >
                <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDate(p.effective_from)}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(p.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(p.id)}
                  disabled={only}
                  aria-label={t('mortgage.deletePayment')}
                  title={only ? t('mortgage.lastPayment') : t('mortgage.deletePayment')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-input-bg)] disabled:opacity-40 disabled:hover:bg-transparent"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          {only && (
            <p className="px-6 pb-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.lastPayment')}</p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete != null}
        title={t('mortgage.deletePaymentConfirm')}
        loading={deleting}
        onConfirm={async () => {
          if (pendingDelete != null) await onDelete(pendingDelete);
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
