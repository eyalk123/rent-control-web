import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarX, History, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DetailRow } from '@/shared/components/detail/DetailRow';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { formatDate, formatMoney } from '@/shared/utils/money';
import { todayISO } from '@/shared/utils/dates';
import {
  useCreateMortgagePayment,
  useCreatePropertyMortgage,
  useDeleteMortgagePayment,
  useDeletePropertyMortgage,
  usePropertyMortgages,
  useUpdatePropertyMortgage,
} from '../queries';
import { formatCoverage } from '../utils/propertyReturns';
import { MortgageDialog, MortgagePaymentDialog, MortgagePaymentHistoryDialog } from './MortgageDialogs';
import type { Mortgage, Property } from '@/shared/types';

const iconBtn =
  'h-8 shrink-0 flex items-center justify-center gap-1 rounded-lg text-[12px] font-medium hover:bg-[var(--color-input-bg)]';

/**
 * The property's mortgages: what goes to the bank each month, and when.
 *
 * Without one it is an invitation, not an empty form — most properties have no mortgage, and
 * the panel then costs a property one short line. Rendered only where the country has the
 * capability (Israel); the API refuses these routes everywhere else.
 */
export function MortgagePanel({ property }: { property: Property }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: mortgages = [], isLoading } = usePropertyMortgages(property.id);
  const createMutation = useCreatePropertyMortgage(property.id);
  const updateMutation = useUpdatePropertyMortgage(property.id);
  const deleteMutation = useDeletePropertyMortgage(property.id);
  const addPaymentMutation = useCreateMortgagePayment(property.id);
  const deletePaymentMutation = useDeleteMortgagePayment(property.id);

  // `null` adds a new mortgage; a mortgage edits it.
  const [editing, setEditing] = useState<Mortgage | null | undefined>(undefined);
  const [paymentFor, setPaymentFor] = useState<Mortgage | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Mortgage | null>(null);

  const failed = () => showToast(t('mortgage.saveFailed'), 'error');
  const historyMortgage = mortgages.find((m) => m.id === historyFor) ?? null;

  if (isLoading) {
    return (
      <DetailPanel title={t('mortgage.section')}>
        <div className="flex justify-center py-6"><LoadingSpinner /></div>
      </DetailPanel>
    );
  }

  return (
    <>
      {mortgages.length === 0 ? (
        <DetailPanel title={t('mortgage.section')}>
          <div className="flex items-start gap-3 px-[18px] py-4">
            <Landmark size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('mortgage.inviteTitle')}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.inviteBody')}</p>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="mt-3 flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {t('mortgage.add')}
              </button>
            </div>
          </div>
        </DetailPanel>
      ) : (
        mortgages.map((m, i) => (
          <MortgageCard
            key={m.id}
            mortgage={m}
            title={mortgages.length > 1 ? t('mortgage.sectionNumbered', { n: i + 1 }) : t('mortgage.section')}
            // The cash flow is for the property as a whole, so it sits under the last mortgage.
            property={i === mortgages.length - 1 ? property : null}
            onNewPayment={() => setPaymentFor(m)}
            onHistory={() => setHistoryFor(m.id)}
            onEdit={() => setEditing(m)}
            onDelete={() => setDeleting(m)}
            onAddAnother={i === mortgages.length - 1 ? () => setEditing(null) : undefined}
          />
        ))
      )}

      <MortgageDialog
        open={editing !== undefined}
        mortgage={editing}
        loading={createMutation.isPending || updateMutation.isPending}
        onCreate={async (data) => {
          try {
            await createMutation.mutateAsync(data);
            setEditing(undefined);
          } catch {
            failed();
          }
        }}
        onUpdate={async (data) => {
          if (!editing) return;
          try {
            await updateMutation.mutateAsync({ mortgageId: editing.id, data });
            setEditing(undefined);
          } catch {
            failed();
          }
        }}
        onClose={() => setEditing(undefined)}
      />
      <MortgagePaymentDialog
        open={paymentFor != null}
        loading={addPaymentMutation.isPending}
        onConfirm={async (data) => {
          if (!paymentFor) return;
          try {
            await addPaymentMutation.mutateAsync({ mortgageId: paymentFor.id, data });
            setPaymentFor(null);
          } catch {
            failed();
          }
        }}
        onClose={() => setPaymentFor(null)}
      />
      <MortgagePaymentHistoryDialog
        mortgage={historyMortgage}
        deleting={deletePaymentMutation.isPending}
        onDelete={async (paymentId) => {
          if (!historyMortgage) return;
          try {
            await deletePaymentMutation.mutateAsync({ mortgageId: historyMortgage.id, paymentId });
          } catch {
            showToast(t('error.saveFailed'), 'error');
          }
        }}
        onClose={() => setHistoryFor(null)}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('mortgage.deleteConfirm')}
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteMutation.mutateAsync(deleting.id);
          } catch {
            showToast(t('error.deleteFailed'), 'error');
          }
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

interface CardProps {
  mortgage: Mortgage;
  title: string;
  /** Set on the card that shows the property's cash flow — the last one. */
  property: Property | null;
  onNewPayment: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddAnother?: () => void;
}

function MortgageCard({ mortgage, title, property, onNewPayment, onHistory, onEdit, onDelete, onAddAnother }: CardProps) {
  const { t } = useTranslation();
  const today = todayISO();
  const ended = mortgage.end_date != null && mortgage.end_date < today;
  // Computed by the server, like the yields — and for the property, not this one mortgage.
  const r = property?.returns;

  return (
    <DetailPanel title={title}>
      <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <Wallet size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
        <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('mortgage.monthlyPayment')}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {mortgage.current_payment != null
            ? formatMoney(mortgage.current_payment)
            : ended ? t('mortgage.ended') : t('mortgage.notStarted')}
        </span>
        <button type="button" onClick={onHistory} className={`${iconBtn} px-2`} style={{ color: 'var(--color-primary)' }}>
          <History size={14} aria-hidden="true" />
          {t('mortgage.history')}
        </button>
        <button
          type="button"
          onClick={onNewPayment}
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

      {/* Neutral ink like the yields above: a number to read, not an alarm. Averages are
          rounded to whole units — they are computed, not amounts anyone typed. */}
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
      {r?.mortgage_coverage != null && (
        <DetailRow icon={Landmark} label={t('mortgage.coverage')} value={formatCoverage(r.mortgage_coverage)} />
      )}

      <div className="flex flex-wrap items-center gap-1 px-[10px] py-2">
        <button type="button" onClick={onEdit} className={`${iconBtn} px-2`} style={{ color: 'var(--color-text-secondary)' }}>
          <Pencil size={14} aria-hidden="true" /> {t('mortgage.edit')}
        </button>
        <button type="button" onClick={onDelete} className={`${iconBtn} px-2`} style={{ color: 'var(--color-error)' }}>
          <Trash2 size={14} aria-hidden="true" /> {t('mortgage.delete')}
        </button>
        {onAddAnother && (
          <button type="button" onClick={onAddAnother} className={`${iconBtn} px-2 ms-auto`} style={{ color: 'var(--color-primary)' }}>
            <Plus size={14} aria-hidden="true" /> {t('mortgage.addAnother')}
          </button>
        )}
      </div>
    </DetailPanel>
  );
}
