import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useRenters } from '../queries';
import { canExerciseOption } from '@/shared/utils/renterStatus';
import { ExerciseOptionDialog } from './ExerciseOptionDialog';

interface Props {
  renterId: number;
  /** Opens the Extend flow — the row's own action, and the dialog's "Change terms instead". */
  onUpdateLease: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * The main action on a lease-expiring alert row. When the lease still has an option year
 * it is **Exercise option** in place of **Update lease**, not beside it — the row keeps
 * the same number of buttons, and Extend stays one tap away inside the dialog.
 *
 * Reads the renter off the full renters list, which the app shell already keeps loaded,
 * so deciding which button to show costs no request. Until it arrives, Update lease.
 */
export function ExpiringLeaseAction({ renterId, onUpdateLease, className, style }: Props) {
  const { t } = useTranslation();
  const { data: renters = [] } = useRenters();
  const [open, setOpen] = useState(false);
  const renter = renters.find((r) => r.id === renterId);

  if (!renter || !canExerciseOption(renter)) {
    return (
      <button onClick={onUpdateLease} className={className} style={style}>
        {t('home.actionUpdateLease')}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} style={style}>
        {t('renter.exerciseOption')}
      </button>
      <ExerciseOptionDialog
        renter={open ? renter : null}
        onClose={() => setOpen(false)}
        onChangeTerms={() => {
          setOpen(false);
          onUpdateLease();
        }}
      />
    </>
  );
}
