import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarX } from 'lucide-react';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { FormInput } from '@/shared/components/form/FormInput';
import { getLeaseEndDate, type Renter } from '@/shared/types';

interface Props {
  open: boolean;
  renter: Renter;
  loading?: boolean;
  onConfirm: (terminatedOn: string, reason: string | null) => void;
  onClose: () => void;
}

function toISODate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().split('T')[0];
}

/**
 * Closing a lease early.
 *
 * Deliberately *not* styled as a destructive dialog: ending a tenancy is an ordinary
 * lifecycle event, and dressing it up like Delete would stop people using it — leaving
 * them to shorten the lease term by hand, which is the destructive path this exists to
 * replace.
 */
export function EndLeaseDialog({ open, renter, loading, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [reason, setReason] = useState('');

  // Reset on each open so a cancelled attempt doesn't pre-fill the next one.
  useEffect(() => {
    if (!open) return;
    setDate(toISODate(new Date()));
    setReason('');
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

  // The same bounds the server enforces, so an invalid date is caught before the round
  // trip rather than coming back as a 400.
  const scheduledEnd = getLeaseEndDate(renter);
  const min = renter.lease_start ?? undefined;
  const max = scheduledEnd ? toISODate(scheduledEnd) : undefined;
  const invalid = Boolean((min && date < min) || (max && date > max));

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
            <CalendarX size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('renter.endLeaseTitle')}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('renter.endLeaseNote')}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <FormDateInput
            label={t('renter.endLeaseDateLabel')}
            value={date}
            min={min}
            max={max}
            onChange={(e) => setDate(e.target.value)}
            error={invalid ? t('renter.endLeaseDateOutOfRange') : undefined}
          />
          <FormInput
            label={t('renter.endLeaseReasonLabel')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            name="termination_reason"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
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
            onClick={() => onConfirm(date, reason.trim() || null)}
            disabled={loading || invalid || !date}
            className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {t('renter.endLeaseConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
