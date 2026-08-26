import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { Stepper } from '@/shared/components/ui/Stepper';
import { periodMonths } from '@/shared/types';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { RentChangeField } from '@/shared/components/lease/RentChangeField';
import { LeaseYearRow } from '@/shared/components/lease/LeaseYearRow';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';
import { LeaseTimeline } from './LeaseTimeline';
import { useUpdateRenter } from '../queries';
import { getApiErrorMessage } from '@/core/api/client';
import {
  buildAddedYears,
  hasContractAfterOptionYear,
  isProjectedYear,
  materializeRuledYears,
  reconstructIntentFromLeaseYears,
} from '@/shared/utils/leaseSchedule';
import { getLeaseEndDate } from '@/shared/types';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { fmtDate } from '@/shared/utils/dates';
import type {
  LeaseYear,
  LeaseYearRuleMode,
  LeaseYearType,
  RentEscalationMode,
  Renter,
} from '@/shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  renter: Renter;
}

/** Editable row — amount stays a string while typing, per the form convention. */
type Row = {
  amount: string;
  type: LeaseYearType;
  /** Custom mode only: how this year derives from the previous one. Absent = manual. */
  rule?: { mode: LeaseYearRuleMode; value: string };
  /** Absent means twelve. Comes from the stepper or the saved schedule, never typed. */
  months?: number;
};

/**
 * Rows -> the numeric model the schedule helpers work on. Rules only mean anything in custom
 * mode, so `withRules: false` drops them — leaving custom mode discards them rather than
 * letting them ride along into a percent/fixed lease.
 */
function toModel(rows: Row[], withRules = true): LeaseYear[] {
  return rows.map((r) => {
    const year: LeaseYear = { amount: Number(r.amount) || 0, type: r.type };
    if (withRules && r.rule && r.rule.mode !== 'manual') {
      year.rule = { mode: r.rule.mode, value: Number(r.rule.value) || 0 };
    }
    // Absent means twelve, so only a short period carries it.
    if (r.months && r.months < 12) year.months = r.months;
    return year;
  });
}

/** A percent/fixed rule with no number behind it can't price its year. */
function ruleValueMissing(rows: Row[]): boolean {
  return rows.some(
    (r) => (r.rule?.mode === 'percent' || r.rule?.mode === 'fixed') && !r.rule.value.trim(),
  );
}

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
/**
 * Rendered inside the Drawer, which unmounts its children when closed — so the request
 * happens when the drawer actually opens, not when the detail page renders it shut.
 */
function ExtendLeaseTourRequest() {
  useTour('extend-lease');
  return null;
}

export function LeaseExtensionDrawer({ open, onClose, renter }: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const updateMutation = useUpdateRenter(renter.id);
  const stepperAnchorRef = useTourAnchor(ANCHORS.extendYearsStepper);
  const previewAnchorRef = useTourAnchor(ANCHORS.extendPreview);

  // The existing lease years, individually editable. New years are derived from the counts
  // (and hand-editable in custom mode).
  const [existingRows, setExistingRows] = useState<Row[]>([]);
  const [addedRows, setAddedRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<RentEscalationMode>('none');
  const [value, setValue] = useState<string>('');
  const [addCount, setAddCount] = useState(0);
  const [addMonths, setAddMonths] = useState(0);
  const [addOptionCount, setAddOptionCount] = useState(0);
  const [addOptionMonths, setAddOptionMonths] = useState(0);
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
      ...(y.months != null ? { months: y.months } : {}),
      ...(y.rule
        ? { rule: { mode: y.rule.mode, value: y.rule.value != null ? String(y.rule.value) : '' } }
        : {}),
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

  const isCustom = mode === 'custom';

  // In custom mode every ruled year is *derived* from the year before it, so the schedule is a
  // pure function of the rows — walk it rather than storing the computed amounts. Hand-typed
  // ("manual") amounts are what the walk reads; everything else it writes.
  const existingYears: LeaseYear[] = useMemo(() => {
    const model = toModel(existingRows, isCustom);
    return isCustom ? materializeRuledYears(model, model[0]?.amount ?? 0) : model;
  }, [existingRows, isCustom]);

  // New-year pricing walks the escalation rule forward from the last existing amount, so the
  // derivation only needs the tail of the schedule — and only re-runs when that amount
  // changes, not on every keystroke in every row.
  const lastExistingAmount = existingYears.length > 0 ? existingYears[existingYears.length - 1].amount : 0;

  // New years grow/shrink reactively with the number inputs — no explicit "add" action.
  // In custom mode the owner hand-prices them (or gives them a rule), so re-deriving preserves
  // what they typed and chose.
  useEffect(() => {
    setAddedRows((prev) => {
      const next = buildAddedYears(
        [{ amount: lastExistingAmount, type: 'contract' }],
        addCount,
        addOptionCount,
        mode,
        Number(value) || 0,
        mode === 'custom' ? toModel(prev) : undefined,
        addMonths,
        addOptionMonths,
      );
      return next.map((y, i) => ({
        amount: mode === 'custom' && prev[i] ? prev[i].amount : String(y.amount),
        type: y.type,
        ...(y.months ? { months: y.months } : {}),
        ...(mode === 'custom' && prev[i]?.rule ? { rule: prev[i].rule } : {}),
      }));
    });
  }, [addCount, addMonths, addOptionCount, addOptionMonths, mode, value, lastExistingAmount]);

  // The added block prices off the last existing year, so in custom mode the two halves have
  // to be walked together and the added tail taken from the result.
  const addedYears: LeaseYear[] = useMemo(() => {
    const model = toModel(addedRows, isCustom);
    if (!isCustom) return model;
    return materializeRuledYears(
      [...existingYears, ...model],
      existingYears[0]?.amount ?? model[0]?.amount ?? 0,
    ).slice(existingYears.length);
  }, [addedRows, existingYears, isCustom]);

  const allYears: LeaseYear[] = useMemo(() => [...existingYears, ...addedYears], [existingYears, addedYears]);

  /** A ruled year shows the walked amount; a manual one shows exactly what was typed. */
  const displayAmount = (row: Row, walked: LeaseYear | undefined) =>
    isCustom && row.rule && row.rule.mode !== 'manual' ? String(walked?.amount ?? 0) : row.amount;

  const orderInvalid = useMemo(() => hasContractAfterOptionYear(allYears), [allYears]);
  // The renter form gets this from Zod; this drawer has no schema, so it gates Save by hand.
  const ruleIncomplete = useMemo(
    () => isCustom && ruleValueMissing([...existingRows, ...addedRows]),
    [isCustom, existingRows, addedRows],
  );

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

  /** Typing an amount by hand means the stated rule no longer describes it — drop to manual. */
  const setAmount = (rows: Row[], index: number, amount: string): Row[] =>
    rows.map((r, i) => (i === index ? { amount, type: r.type } : r));

  const setRule = (rows: Row[], index: number, mode: LeaseYearRuleMode): Row[] =>
    rows.map((r, i) =>
      i === index
        ? mode === 'manual'
          ? { amount: r.amount, type: r.type }
          : { ...r, rule: { mode, value: r.rule?.value ?? '' } }
        : r,
    );

  const setRuleValue = (rows: Row[], index: number, value: string): Row[] =>
    rows.map((r, i) => (i === index && r.rule ? { ...r, rule: { ...r.rule, value } } : r));

  const updateAmount = (index: number, amount: string) =>
    setExistingRows((prev) => setAmount(prev, index, amount));

  const removeRow = (index: number) => setExistingRows((prev) => prev.filter((_, i) => i !== index));

  const toggleType = (index: number) =>
    setExistingRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, type: r.type === 'contract' ? 'option' : 'contract' } : r)),
    );

  const updateAddedAmount = (index: number, amount: string) =>
    setAddedRows((prev) => setAmount(prev, index, amount));

  const contractMonths = allYears
    .filter((y) => y.type === 'contract')
    .reduce((sum, y) => sum + periodMonths(y), 0);
  const optionMonths = allYears
    .filter((y) => y.type === 'option')
    .reduce((sum, y) => sum + periodMonths(y), 0);

  const handleSave = async () => {
    if (orderInvalid || ruleIncomplete) return;
    try {
      await updateMutation.mutateAsync({
        lease_years: allYears,
        // Whole years plus a remainder, derived from the periods' real lengths —
        // counting rows would record a 4-month tail as another whole year and push the
        // lease end date out by eight months on the next edit.
        contract_term_years: Math.floor(contractMonths / 12),
        contract_term_months: contractMonths % 12,
        option_years: Math.floor(optionMonths / 12),
        option_term_months: optionMonths % 12,
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
        disabled={updateMutation.isPending || !dirty || orderInvalid || ruleIncomplete}
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
          <ExtendLeaseTourRequest />
          {/* Current lease (read-only reference) */}
          <LeaseTimeline renter={renter} />

          {/* Add years — the number inputs drive the schedule; no button */}
          <div className="rounded-[var(--radius-card)] p-4" style={{ border: '1px solid var(--color-outline)', background: 'var(--color-surface)' }}>
            <div ref={stepperAnchorRef} className="flex flex-wrap gap-4">
              <Stepper
                label={t('renter.yearsToAdd')}
                unitLabel={t('renter.yearsUnit')}
                min={0}
                max={10}
                value={addCount}
                onChange={setAddCount}
              />
              {/* A few months is the common holdover, and the reason this stepper
                  exists: extending by a whole year is often not what was agreed. */}
              <Stepper
                label={t('renter.extraMonths')}
                unitLabel={t('renter.monthsUnit')}
                min={0}
                max={11}
                value={addMonths}
                onChange={setAddMonths}
              />
              <Stepper
                label={t('renter.optionYearsToAdd')}
                unitLabel={t('renter.yearsUnit')}
                min={0}
                max={10}
                value={addOptionCount}
                onChange={setAddOptionCount}
              />
              <Stepper
                label={t('renter.extraMonths')}
                unitLabel={t('renter.monthsUnit')}
                min={0}
                max={11}
                value={addOptionMonths}
                onChange={setAddOptionMonths}
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
          <div ref={previewAnchorRef}>
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
              <>
              <div className="flex flex-col gap-1.5">
                {/* Existing years — editable amount, deletable, type convertible. In custom
                    mode each year past the first also carries its own rule. */}
                {existingRows.map((row, index) => (
                  <LeaseYearRow
                    key={`existing-${index}`}
                    label={getLeaseYearLabel(leaseStart, allYears, index, i18n.language)}
                    amount={displayAmount(row, existingYears[index])}
                    type={row.type}
                    isCurrent={isCurrentLeaseYear(leaseStart, allYears, index)}
                    onAmountChange={(v) => updateAmount(index, v)}
                    onTypeToggle={() => toggleType(index)}
                    onRemove={() => removeRow(index)}
                    projected={isCustom && isProjectedYear(allYears, index)}
                    // Year one is the base rent — nothing to derive it from.
                    ruleMode={row.rule?.mode ?? 'manual'}
                    onRuleChange={
                      isCustom && index > 0
                        ? (m) => setExistingRows((prev) => setRule(prev, index, m))
                        : undefined
                    }
                    ruleValue={row.rule?.value ?? ''}
                    onRuleValueChange={(v) => setExistingRows((prev) => setRuleValue(prev, index, v))}
                  />
                ))}
                {/* Added years — auto-priced from the escalation rule, except in custom mode
                    where the owner prices them by hand or gives each its own rule. */}
                {addedRows.map((row, j) => {
                  const absoluteIndex = existingRows.length + j;
                  return (
                    <LeaseYearRow
                      key={`added-${j}`}
                      label={getLeaseYearLabel(leaseStart, allYears, absoluteIndex, i18n.language)}
                      amount={displayAmount(row, addedYears[j])}
                      type={row.type}
                      onAmountChange={isCustom ? (v) => updateAddedAmount(j, v) : undefined}
                      // CPI amounts are index-linked and priced server-side — a client-side
                      // figure here is only an estimate. In custom mode that's true of a CPI
                      // year and everything downstream of it.
                      projected={isCustom ? isProjectedYear(allYears, absoluteIndex) : mode === 'cpi'}
                      ruleMode={row.rule?.mode ?? 'manual'}
                      onRuleChange={
                        isCustom && absoluteIndex > 0
                          ? (m) => setAddedRows((prev) => setRule(prev, j, m))
                          : undefined
                      }
                      ruleValue={row.rule?.value ?? ''}
                      onRuleValueChange={(v) => setAddedRows((prev) => setRuleValue(prev, j, v))}
                      badge={<Pill tone="neutral" size="sm">{t('renter.newYearTag')}</Pill>}
                    />
                  );
                })}
              </div>

              {isCustom && isProjectedYear(allYears, allYears.length - 1) && (
                <p className="text-[13px] leading-snug mt-2 text-[var(--color-text-secondary)]">
                  {t('renter.cpiProjectedNote')}
                </p>
              )}
              </>
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
