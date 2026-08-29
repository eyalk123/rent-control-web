import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { useLanguage } from '@/hooks/useLanguage';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { getPaymentMethodLabel } from '@/shared/constants/paymentMethods';
import type { MonthCell } from '../utils/rentSchedule';

interface Props {
  open: boolean;
  onClose: () => void;
  cell: MonthCell | null;
  /** "March 2026" — the month this cell stands for, already localised. */
  monthLabel: string;
}

/**
 * Every payment recorded against one month of the rent grid.
 *
 * A month box sums *all* the revenue rows filed under its `month_for`, so a duplicated
 * month reads as one implausibly large payment — and clicking it used to open only the
 * first of the rows, which is how "paid ₪36,000" could open a ₪12,000 transaction. This
 * lists the rows behind the sum so the extra ones can be seen and, from their own detail
 * pages, deleted.
 *
 * Dates come from `fmtDate`, not `fmtTxDate`: the latter collapses revenue to its month,
 * which is exactly the distinction that matters here.
 */
export function MonthPaymentsDialog({ open, onClose, cell, monthLabel }: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();

  if (!cell) return null;

  // Oldest first: the order they were recorded in is the order they were (mis)entered in.
  const payments = [...cell.transactions].sort((a, b) =>
    (a.date_of_payment ?? '').localeCompare(b.date_of_payment ?? ''),
  );

  const open_ = (id: number) => {
    onClose();
    navigate(`/transactions/${id}`);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('transactions.rentGrid.monthPayments.title', { month: monthLabel })}
      width={440}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('transactions.rentGrid.monthPayments.recorded', {
            amount: formatMoney(cell.paidSum),
            count: payments.length,
          })}
          {cell.expected > 0 && (
            <>
              {' · '}
              <span style={{ color: cell.hasAmountMismatch ? 'var(--color-warning-fg)' : undefined }}>
                {t('transactions.rentGrid.expectedWas', { amount: formatMoney(cell.expected) })}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-col gap-2">
          {payments.map((tx) => {
            const method = getPaymentMethodLabel(tx.payment_method, t);
            return (
              <button
                key={tx.id}
                type="button"
                onClick={() => open_(tx.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] p-3 text-start transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-outline)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    <LtrSpan>{formatMoney(tx.amount)}</LtrSpan>
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('transactions.rentGrid.monthPayments.paidOn', { date: fmtDate(tx.date_of_payment) })}
                    {method && ` · ${method}`}
                  </p>
                </div>
                <span style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true">
                  {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Deleting lives on the transaction's own page, which is one tap away — putting a
            destructive control on a list you opened to *understand* it invites the wrong
            row being removed. */}
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('transactions.rentGrid.monthPayments.hint')}
        </p>
      </div>
    </Drawer>
  );
}
