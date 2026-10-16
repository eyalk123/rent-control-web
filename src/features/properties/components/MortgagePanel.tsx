import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarX, History, Landmark, Plus, Wallet } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DetailRow } from '@/shared/components/detail/DetailRow';
import { useToast } from '@/shared/components/ui/Toast';
import { formatDate, formatMoney } from '@/shared/utils/money';
import { todayISO } from '@/shared/utils/dates';
import { useCreateMortgagePayment, useDeleteMortgagePayment } from '../queries';
import { formatCoverage } from '../utils/propertyReturns';
import { MortgagePaymentDialog, MortgagePaymentHistoryDialog } from './MortgageDialogs';
import type { Mortgage, Property } from '@/shared/types';

const iconBtn =
  'h-8 shrink-0 flex items-center justify-center gap-1 rounded-lg text-[12px] font-medium hover:bg-[var(--color-input-bg)]';

/**
 * The property's mortgage, and the cash flow after it. Rendered only when the property has
 * one — the property form's switch is where a mortgage is added, corrected or removed.
 *
 * What lives here is what the form deliberately does not do: recording that the payment
 * changed from a date on (a rate change), which keeps the months before it as they were.
 */
export function MortgagePanel({ property, mortgage }: { property: Property; mortgage: Mortgage }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const addPayment = useCreateMortgagePayment(property.id);
  const deletePayment = useDeleteMortgagePayment(property.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const ended = mortgage.end_date != null && mortgage.end_date < todayISO();
  // Computed by the server, like the yields.
  const r = property.returns;

  return (
    <DetailPanel title={t('mortgage.section')}>
      <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <Wallet size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
        <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.monthlyPayment')}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {mortgage.current_payment != null
            ? formatMoney(mortgage.current_payment)
            : ended ? t('mortgage.ended') : t('mortgage.notStarted')}
        </span>
        <button type="button" onClick={() => setHistoryOpen(true)} className={`${iconBtn} px-2`} style={{ color: 'var(--color-primary)' }}>
          <History size={14} aria-hidden="true" />
          {t('mortgage.history')}
        </button>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          aria-label={t('mortgage.newPayment')}
          title={t('mortgage.newPayment')}
          className={`${iconBtn} w-8 text-white hover:opacity-90`}
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <DetailRow icon={CalendarDays} label={t('mortgage.chargeDay')} value={t('mortgage.chargeDayValue', { day: mortgage.charge_day })} />
      <DetailRow icon={CalendarX} label={t('mortgage.endDate')} value={mortgage.end_date ? formatDate(mortgage.end_date) : null} />

      {/* Neutral ink like the yields: a number to read, not an alarm. Averages are rounded to
          whole units — they are computed, not amounts anyone typed. */}
      {r?.monthly_left != null && (
        <>
          <DetailRow icon={Wallet} label={t('mortgage.averageExpenses')} value={formatMoney(Math.round(r.monthly_expenses ?? 0))} />
          <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
            <Wallet size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
            <span className="flex-1 flex flex-col">
              <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.left')}</span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.leftSub')}</span>
            </span>
            <span dir="ltr" className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(Math.round(r.monthly_left))}
            </span>
          </div>
        </>
      )}
      <DetailRow
        icon={Landmark}
        label={t('mortgage.coverage')}
        value={r?.mortgage_coverage != null ? formatCoverage(r.mortgage_coverage) : null}
        last
      />

      <MortgagePaymentDialog
        open={paymentOpen}
        loading={addPayment.isPending}
        onConfirm={async (data) => {
          try {
            await addPayment.mutateAsync({ mortgageId: mortgage.id, data });
            setPaymentOpen(false);
          } catch {
            showToast(t('mortgage.saveFailed'), 'error');
          }
        }}
        onClose={() => setPaymentOpen(false)}
      />
      <MortgagePaymentHistoryDialog
        mortgage={historyOpen ? mortgage : null}
        deleting={deletePayment.isPending}
        onDelete={async (paymentId) => {
          try {
            await deletePayment.mutateAsync({ mortgageId: mortgage.id, paymentId });
          } catch {
            showToast(t('error.saveFailed'), 'error');
          }
        }}
        onClose={() => setHistoryOpen(false)}
      />
    </DetailPanel>
  );
}
