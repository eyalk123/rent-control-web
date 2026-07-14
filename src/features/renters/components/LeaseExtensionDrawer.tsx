import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { Stepper } from '@/shared/components/ui/Stepper';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { RentChangeField } from '@/shared/components/lease/RentChangeField';
import { LeaseYearRow } from '@/shared/components/lease/LeaseYearRow';
import { LeaseTimeline } from './LeaseTimeline';
import { useUpdateRenter } from '../queries';
import { getApiErrorMessage } from '@/core/api/client';
import { buildAddedYears, hasContractAfterOptionYear, reconstructIntentFromLeaseYears } from '@/shared/utils/leaseSchedule';
import { getLeaseEndDate } from '@/shared/types';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { fmtDate } from '@/shared/utils/dates';
import type { LeaseYear, LeaseYearType, RentEscalationMode, Renter } from '@/shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  renter: Renter;
}

/** Editable row — amount stays a string while typing, per the form convention. */
type Row = { amount: string; type: LeaseYearType };

/**
 * Focused lease-extension flow. Shows the current lease, lets the owner grow the lease with
 * "years to add" + "option years to add" number inputs (auto-priced from the lease's existing
 * escalation) and edit/delete/convert the existing years, then saves the whole schedule via
 * PATCH. Order is validated (contract years must precede option years) rather than
 * auto-restructured — the owner is warned and resolves it.
 *
 * Offers the same escalation modes as the renter form (RentChangeField): in "custom" mode the
 * new years become hand-editable too, so every amount in the schedule can be priced by hand.
 */
export function LeaseExtensionDrawer({ open, onClose, renter }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const updateMutation = useUpdateRenter(renter.id);

  // The existing lease years, individually editable. New years are derived from the counts
  // (and hand-editable in custom mode).
  const [existingRows, setExistingRows] = useState<Row[]>([]);
  const [addedRows, setAddedRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<RentEscalationMode>('none');
  const [value, setValue] = useState<string>('');
  const [addCount, setAddCount] = useState(0);
  const [addOptionCount, setAddOptionCount] = useState(0);
  const [showDiscard, setShowDiscard] = useState(false);
  // Read during render (to gate the save/discard affordances), so it's state, not a ref.
  const [initialSnapshot, setInitialSnapshot] = useState('');

  // Seed local state from the renter each time the drawer opens. Prefer the persisted
  // escalation rule; fall back to what the saved schedule implies. The saved mode is kept
  // as-is (including "custom"/"cpi") — coercing it here would silently rewrite the renter's
  // escalation rule on the next save.
  useEffect(() => {
    if (!open) return;
    const seededRows: Row[] = (renter.lease_years ?? []).map((y) => ({
      amount: String(y.amount),
      type: y.type,
    }));
    const seededMode: RentEscalationMode =
      renter.rent_escalation_mode ?? reconstructIntentFromLeaseYears(renter.lease_years).escalationMode;
    const seededValue = renter.rent_escalation_value != null ? String(renter.rent_escalation_value) : '';
    setExistingRows(seededRows);
    setAddedRows([]);
    setMode(seededMode);
    setValue(seededValue);
    setAddCount(0);
    setAddOptionCount(0);
    setShowDiscard(false);
    setInitialSnapshot(JSON.stringify({ rows: seededRows, added: [], mode: seededMode, value: seededValue }));
  }, [open, renter]);

  const existingYears: LeaseYear[] = useMemo(
    () => existingRows.map((r) => ({ amount: Number(r.amount) || 0, type: r.type })),
    [existingRows],
  );

  // New-year pricing walks the escalation rule forward from the last existing amount, so the
  // derivation only needs the tail of the schedule — and only re-runs when that amount
  // changes, not on every keystroke in every row.
  const lastExistingAmount = existingYears.length > 0 ? existingYears[existingYears.length - 1].amount : 0;

  // New years grow/shrink reactively with the number inputs — no explicit "add" action.
  // In custom mode the owner hand-prices them, so re-deriving preserves what they typed.
  useEffect(() => {
    setAddedRows((prev) => {
      const next = buildAddedYears(
        [{ amount: lastExistingAmount, type: 'contract' }],
        addCount,
        addOptionCount,
        mode,
        Number(value) || 0,
      );
      return next.map((y, i) => ({
        amount: mode === 'custom' && prev[i] ? prev[i].amount : String(y.amount),
        type: y.type,
      }));
    });
  }, [addCount, addOptionCount, mode, value, lastExistingAmount]);

  const addedYears: LeaseYear[] = useMemo(
    () => addedRows.map((r) => ({ amount: Number(r.amount) || 0, type: r.type })),
    [addedRows],
  );

  const allYears: LeaseYear[] = useMemo(() => [...existingYears, ...addedYears], [existingYears, addedYears]);

  const orderInvalid = useMemo(() => hasContractAfterOptionYear(allYears), [allYears]);

  const leaseStart = renter.lease_start;
  const originalEnd = getLeaseEndDate(renter);
  const newEnd = useMemo(
    () => getLeaseEndDate({ ...renter, lease_years: allYears }),
    [renter, allYears],
  );
  const yearDelta = allYears.length - (renter.lease_years?.length ?? 0);

  const dirty =
    JSON.stringify({ rows: existingRows, added: addedRows, mode, value }) !== initialSnapshot;
  const attemptClose = () => {
    if (dirty) setShowDiscard(true);
    else onClose();
  };

  const updateAmount = (index: number, amount: string) =>
    setExistingRows((prev) => prev.map((r, i) => (i === index ? { ...r, amount } : r)));

  const removeRow = (index: number) => setExistingRows((prev) => prev.filter((_, i) => i !== index));

  const toggleType = (index: number) =>
    setExistingRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, type: r.type === 'contract' ? 'option' : 'contract' } : r)),
    );

  const updateAddedAmount = (index: number, amount: string) =>
    setAddedRows((prev) => prev.map((r, i) => (i === index ? { ...r, amount } : r)));

  const handleSave = async () => {
    if (orderInvalid) return;
    try {
      await updateMutation.mutateAsync({
        lease_years: allYears,
        contract_term_years: allYears.filter((y) => y.type === 'contract').length,
        option_years: allYears.filter((y) => y.type === 'option').length,
        rent_escalation_mode: mode,
        // Only percent/fixed carry a step; none/cpi/custom must not keep a stale one.
        rent_escalation_value:
          (mode === 'percent' || mode === 'fixed') && value ? Number(value) : null,
      });
      showToast(t('renter.extendLeaseSuccess'), 'success');
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[LeaseExtensionDrawer] save failed:', err);
      showToast(getApiErrorMessage(err, t('error.saveFailed')), 'error');
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={attemptClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={updateMutation.isPending || !dirty || orderInvalid}
        className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {updateMutation.isPending ? '...' : t('common.save')}
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        onRequestClose={attemptClose}
        title={t('renter.extendLeaseTitle')}
        width={560}
        footer={footer}
      >
        <div className="flex flex-col gap-6">
          {/* Current lease (read-only reference) */}
          <LeaseTimeline renter={renter} />

          {/* Add years — the number inputs drive the schedule; no button */}
          <div className="rounded-[var(--radius-card)] p-4" style={{ border: '1px solid var(--color-outline)', background: 'var(--color-surface)' }}>
            <div className="flex flex-wrap gap-4">
              <Stepper
                label={t('renter.yearsToAdd')}
                unitLabel={t('renter.yearsUnit')}
                min={0}
                max={10}
                value={addCount}
                onChange={setAddCount}
              />
              <Stepper
                label={t('renter.optionYearsToAdd')}
                unitLabel={t('renter.yearsUnit')}
                min={0}
                max={10}
                value={addOptionCount}
                onChange={setAddOptionCount}
              />
            </div>

            <RentChangeField
              label={t('renter.newYearIncrement')}
              mode={mode}
              onModeChange={setMode}
              value={value}
              onValueChange={setValue}
              className="mt-4"
            />
          </div>

          {/* New lease schedule = live preview */}
          <div>
            <p className="text-sm font-medium mb-2 text-[var(--color-text-primary)]">{t('renter.newLeaseSchedule')}</p>

            {orderInvalid && (
              <div
                className="flex items-start gap-2 rounded-[10px] p-3 mb-2 text-[13px]"
                style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}
              >
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{t('renter.leaseOrderWarning')}</span>
              </div>
            )}

            {allYears.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>{t('renter.noLeaseYears')}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {/* Existing years — editable amount, deletable, type convertible */}
                {existingRows.map((row, index) => (
                  <LeaseYearRow
                    key={`existing-${index}`}
                    label={getLeaseYearLabel(leaseStart, index)}
                    amount={row.amount}
                    type={row.type}
                    isCurrent={isCurrentLeaseYear(leaseStart, index)}
                    onAmountChange={(v) => updateAmount(index, v)}
                    onTypeToggle={() => toggleType(index)}
                    onRemove={() => removeRow(index)}
                  />
                ))}
                {/* Added years — auto-priced from the escalation rule, except in custom mode
                    where the owner prices them by hand. */}
                {addedRows.map((row, j) => (
                  <LeaseYearRow
                    key={`added-${j}`}
                    label={getLeaseYearLabel(leaseStart, existingRows.length + j)}
                    amount={row.amount}
                    type={row.type}
                    onAmountChange={mode === 'custom' ? (v) => updateAddedAmount(j, v) : undefined}
                    // CPI amounts are index-linked and priced server-side — a client-side
                    // figure here is only an estimate.
                    projected={mode === 'cpi'}
                    badge={<Pill tone="neutral" size="sm">{t('renter.newYearTag')}</Pill>}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Change summary */}
          <div className="rounded-[var(--radius-card)] p-4" style={{ border: '1px solid var(--color-outline)', background: 'var(--color-input-filled-background)' }}>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              <CalendarClock size={15} />
              <LtrSpan>{originalEnd ? fmtDate(originalEnd.toISOString().split('T')[0]) : '—'}</LtrSpan>
              <ArrowRight size={13} />
              <LtrSpan className="font-semibold text-[var(--color-text-primary)]">
                {newEnd ? fmtDate(newEnd.toISOString().split('T')[0]) : '—'}
              </LtrSpan>
            </div>
            {yearDelta !== 0 && (
              <p className="text-[13px] font-medium mt-1.5" style={{ color: yearDelta > 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {yearDelta > 0
                  ? t('renter.yearsAdded', { count: yearDelta })
                  : t('renter.yearsRemoved', { count: Math.abs(yearDelta) })}
              </p>
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={showDiscard}
        tone="primary"
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        confirmLabel={t('common.discard')}
        onConfirm={() => { setShowDiscard(false); onClose(); }}
        onClose={() => setShowDiscard(false)}
      />
    </>
  );
}
