import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/core/api/client';
import { getLeaseEndDate, type Renter } from '@/shared/types';
import { exerciseNextOption } from '@/shared/utils/leaseSchedule';
import { leaseYearStart } from '@/shared/utils/leaseYear';
import { fmtDate, toISODate } from '@/shared/utils/dates';
import { formatMoney } from '@/shared/utils/money';
import { useUpdateRenter } from '../queries';

interface Props {
  /** Null while closed — the alert rows open it for whichever renter was clicked. */
  renter: Renter | null;
  onClose: () => void;
  /** "Change terms instead": the renewal came with a different rent, so open Extend. */
  onChangeTerms: () => void;
}

/**
 * One-step "the tenant took the option": flips the next option year to a contract year and
 * saves. Amount, rule and length stay as signed — a renewal on different terms is what
 * "Change terms instead" (the Extend flow) is for. The contract end moves out by that year,
 * which is also what clears the lease-expiring alert.
 */
export function ExerciseOptionDialog({ renter, onClose, onChangeTerms }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const updateMutation = useUpdateRenter(renter?.id ?? 0);

  const exercised = renter ? exerciseNextOption(renter.lease_years) : null;
  if (!renter || !exercised) return null;

  const start = leaseYearStart(renter.lease_start, renter.lease_years, exercised.index);
  const newEnd = getLeaseEndDate({ ...renter, lease_years: exercised.leaseYears });
  const newEndLabel = newEnd ? fmtDate(toISODate(newEnd)) : '—';

  const handleConfirm = async () => {
    try {
      await updateMutation.mutateAsync({ lease_years: exercised.leaseYears, ...exercised.intent });
      showToast(t('renter.exerciseOptionSuccess', { date: newEndLabel }), 'success');
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ExerciseOptionDialog] save failed:', err);
      showToast(getApiErrorMessage(err, t('error.saveFailed')), 'error');
    }
  };

  return (
    <ConfirmDialog
      open
      tone="primary"
      title={t('renter.exerciseOptionTitle', { name: `${renter.first_name} ${renter.last_name}` })}
      message={t('renter.exerciseOptionBody', {
        start: start ? fmtDate(toISODate(start)) : '—',
        amount: formatMoney(renter.lease_years[exercised.index].amount),
        date: newEndLabel,
      })}
      confirmLabel={t('renter.exerciseOption')}
      loading={updateMutation.isPending}
      altAction={{ label: t('renter.exerciseOptionChangeTerms'), onClick: onChangeTerms }}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
}
