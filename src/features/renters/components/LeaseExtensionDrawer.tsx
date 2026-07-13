import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { Stepper } from '@/shared/components/ui/Stepper';
import { EscalationValueField } from '@/shared/components/form/EscalationValueField';
import { LeaseYearAmountField } from '@/shared/components/form/LeaseYearAmountField';
import { LeaseYearTypeText } from '@/shared/components/form/LeaseYearTypeText';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { LeaseTimeline } from './LeaseTimeline';
import { useUpdateRenter } from '../queries';
import { getApiErrorMessage } from '@/core/api/client';
import { buildAddedYears, hasContractAfterOptionYear, reconstructIntentFromLeaseYears } from '@/shared/utils/leaseSchedule';
import { getLeaseEndDate } from '@/shared/types';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import type { LeaseYear, LeaseYearType, RentEscalationMode, Renter } from '@/shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  renter: Renter;
}

/** Editable row — amount stays a string while typing, per the form convention. */
type Row = { amount: string; type: LeaseYearType };

// Increment applied to *new* years. "custom" is intentionally omitted: existing rows are
// individually editable, and added rows follow the increment.
const INCREMENT_MODES: RentEscalationMode[] = ['none', 'percent', 'fixed'];

/**
 * Focused lease-extension flow. Shows the current lease, lets the owner grow the lease with
 * "years to add" + "option years to add" number inputs (auto-priced from the lease's existing
 * escalation) and edit/delete/convert the existing years, then saves the whole schedule via
 * PATCH. Order is validated (contract years must precede option years) rather than
 * auto-restructured — the owner is warned and resolves it.
 */
export function LeaseExtensionDrawer({ open, onClose, renter }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const updateMutation = useUpdateRenter(renter.id);

  // The existing lease years, individually editable. New years are derived from the counts.
  const [existingRows, setExistingRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<RentEscalationMode>('none');
  const [value, setValue] = useState<string>('');
  const [addCount, setAddCount] = useState(0);
  const [addOptionCount, setAddOptionCount] = useState(0);
  const [showDiscard, setShowDiscard] = useState(false);
  const initialSnapshot = useRef<string>('');

  // Seed local state from the renter each time the drawer opens. Prefer the persisted
  // escalation rule; fall back to what the saved schedule implies.
  useEffect(() => {
    if (!open) return;
    const seededRows: Row[] = (renter.lease_years ?? []).map((y) => ({
      amount: String(y.amount),
      type: y.type,
    }));
    const seededMode: RentEscalationMode =
      renter.rent_escalation_mode ?? reconstructIntentFromLeaseYears(renter.lease_years).escalationMode;
    // The editor only exposes none/percent/fixed; treat a saved "custom" as "none".
    const editorMode: RentEscalationMode = seededMode === 'custom' ? 'none' : seededMode;
    const seededValue = renter.rent_escalation_value != null ? String(renter.rent_escalation_value) : '';
    setExistingRows(seededRows);
    setMode(editorMode);
    setValue(seededValue);
    setAddCount(0);
    setAddOptionCount(0);
    setShowDiscard(false);
    initialSnapshot.current = JSON.stringify({ rows: seededRows, mode: editorMode, value: seededValue, addCount: 0, addOptionCount: 0 });
  }, [open, renter]);

  const existingYears: LeaseYear[] = useMemo(
    () => existingRows.map((r) => ({ amount: Number(r.amount) || 0, type: r.type })),
    [existingRows],
  );

  // New years grow/shrink reactively with the number inputs — no explicit "add" action.
  const addedYears: LeaseYear[] = useMemo(
    () => buildAddedYears(existingYears, addCount, addOptionCount, mode, Number(value) || 0),
    [existingYears, addCount, addOptionCount, mode, value],
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
    JSON.stringify({ rows: existingRows, mode, value, addCount, addOptionCount }) !== initialSnapshot.current;
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

  const handleSave = async () => {
    if (orderInvalid) return;
    try {
      await updateMutation.mutateAsync({
        lease_years: allYears,
        contract_term_years: allYears.filter((y) => y.type === 'contract').length,
        option_years: allYears.filter((y) => y.type === 'option').length,
        rent_escalation_mode: mode,
        rent_escalation_value: value ? Number(value) : null,
      });
      showToast(t('renter.extendLeaseSuccess'), 'success');
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[LeaseExtensionDrawer] save failed:', err);
      showToast(getApiErrorMessage(err, t('error.saveFailed')), 'error');
    }
  };

  const incrementSegments = INCREMENT_MODES.map((m) => ({
    value: m,
    label:
      m === 'none'
        ? t('renter.rentChangeSame')
        : m === 'percent'
        ? t('renter.rentChangePercent')
        : t('renter.rentChangeFixed'),
  }));

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

            {/* Increment for new years */}
            <div className="flex flex-col gap-1.5 mt-4">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('renter.newYearIncrement')}</span>
              {mode === 'cpi' ? (
                // CPI-linked lease: linkage is preserved and priced server-side; no
                // manual increment choice here.
                <p className="text-[13px] leading-snug text-[var(--color-text-secondary)]">
                  {t('renter.rentChangeCpiNote')}
                </p>
              ) : (
                <SegToggle value={mode} onChange={setMode} options={incrementSegments} />
              )}
            </div>
            {(mode === 'percent' || mode === 'fixed') && (
              <EscalationValueField mode={mode} value={value} onChange={setValue} className="mt-3" />
            )}
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
                {existingRows.map((row, index) => {
                  const isCurrent = isCurrentLeaseYear(leaseStart, index);
                  return (
                    <div
                      key={`existing-${index}`}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-[8px]"
                      style={isCurrent ? { background: 'var(--color-rev-bg)' } : undefined}
                    >
                      <span
                        className={`text-[15px] min-w-[52px] text-[var(--color-text-primary)] ${isCurrent ? 'font-extrabold' : 'font-semibold'}`}
                      >
                        {getLeaseYearLabel(leaseStart, index)}
                      </span>
                      <LeaseYearAmountField
                        aria-label={t('renter.amount')}
                        value={row.amount}
                        onChange={(v) => updateAmount(index, v)}
                      />
                      <button
                        type="button"
                        onClick={() => toggleType(index)}
                        title={t('renter.tapToChangeType')}
                        className="w-16 text-end rounded px-1 py-0.5 transition-colors hover:bg-[var(--color-input-filled-background)] underline decoration-dotted underline-offset-2"
                      >
                        <LeaseYearTypeText type={row.type} />
                      </button>
                      {isCurrent && <Pill tone="revenue" size="sm">{t('renter.currentLease')}</Pill>}
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label={t('renter.removeYear')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-input-filled-background)]"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
                {/* Added years — auto-priced, read-only (adjust via the number inputs + increment) */}
                {addedYears.map((year, j) => {
                  const index = existingRows.length + j;
                  return (
                    <div key={`added-${j}`} className="flex items-center gap-3 px-2 py-1.5 rounded-[8px]">
                      <span className="text-[15px] min-w-[52px] font-semibold text-[var(--color-text-primary)]">
                        {getLeaseYearLabel(leaseStart, index)}
                      </span>
                      <LtrSpan
                        className="flex-1 text-[15px] font-semibold text-[var(--color-text-primary)]"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {year.amount > 0 ? formatMoney(year.amount) : '—'}
                      </LtrSpan>
                      <LeaseYearTypeText type={year.type} className="w-16 text-end" />
                      <Pill tone="neutral" size="sm">{t('renter.newYearTag')}</Pill>
                    </div>
                  );
                })}
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
