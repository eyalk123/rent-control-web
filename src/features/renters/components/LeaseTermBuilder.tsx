import { useEffect, useRef } from 'react';
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import { addMonths, periodMonths } from '@/shared/types';
import type {
  LeaseYear,
  LeaseYearRuleMode,
  LeaseYearType,
  RentEscalationMode,
} from '@/shared/types';
import type { RenterFormValues } from '../validation/renterValidation';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { buildLeaseYears, isProjectedYear } from '@/shared/utils/leaseSchedule';
import { fmtDate, toISODate } from '@/shared/utils/dates';
import { Stepper } from '@/shared/components/ui/Stepper';
import { FormInput } from '@/shared/components/form/FormInput';
import { RentChangeField } from '@/shared/components/lease/RentChangeField';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';
import { LeaseYearRow } from '@/shared/components/lease/LeaseYearRow';

interface Props {
  control: Control<RenterFormValues>;
  /** Needed so editing year one's amount keeps the "first-year rent" field in step with it. */
  setValue: UseFormSetValue<RenterFormValues>;
}

/**
 * Form-state shape of a lease year: numbers live as strings while the user types.
 * `rule.value` is always present (possibly '') — the Zod schema coerces it that way.
 */
type LeaseYearRowValue = {
  amount?: string;
  type?: LeaseYearType;
  rule?: { mode: LeaseYearRuleMode; value: string };
  /** Absent means twelve. Set by the steppers, never typed directly. */
  months?: number;
};

/** Form rows -> the numeric model the schedule helpers work on. */
function toModel(rows: LeaseYearRowValue[]): LeaseYear[] {
  return rows.map((r) => {
    const year: LeaseYear = {
      amount: Number(r?.amount) || 0,
      type: r?.type ?? 'contract',
    };
    // "manual" is the absence of a rule — don't carry it into the model or the payload.
    if (r?.rule && r.rule.mode !== 'manual') {
      year.rule = { mode: r.rule.mode, value: Number(r.rule.value) || 0 };
    }
    // Absent means twelve, so a full-year period never carries the field — which keeps
    // an ordinary lease's payload identical to what it has always been.
    if (r?.months && r.months < 12) year.months = r.months;
    return year;
  });
}

export function LeaseTermBuilder({ control, setValue }: Props) {
  const { t, i18n } = useTranslation();

  const contractStr = useWatch({ control, name: 'contractTermYears' }) as string | undefined;
  const contractMonthsStr = useWatch({ control, name: 'contractTermMonths' }) as
    | string
    | undefined;
  const optionStr = useWatch({ control, name: 'optionYears' }) as string | undefined;
  const optionMonthsStr = useWatch({ control, name: 'optionTermMonths' }) as
    | string
    | undefined;
  const baseRentStr = useWatch({ control, name: 'baseRent' }) as string | undefined;
  const escMode =
    (useWatch({ control, name: 'escalationMode' }) as RentEscalationMode | undefined) ?? 'none';
  const escValStr = useWatch({ control, name: 'escalationValue' }) as string | undefined;
  const leaseStart = useWatch({ control, name: 'leaseStart' }) as string | undefined;
  const leaseYears =
    (useWatch({ control, name: 'leaseYears' }) as LeaseYearRowValue[] | undefined) ?? [];

  const { replace } = useFieldArray({ control, name: 'leaseYears' });

  const isCustom = escMode === 'custom';

  // Set when the user actively switches *into* CPI via the escalation toggle (never
  // on edit-hydration, which flows through form reset()). Signals the effect to drop
  // the outgoing mode's amounts and project the flat base instead of preserving them.
  const cpiSwitchRef = useRef(false);

  // Re-run the effect when a per-year rule changes (custom mode), so the walk re-prices the
  // ruled years. Amounts are deliberately NOT in the deps — see below.
  const rulesKey = JSON.stringify(leaseYears.map((r) => r.rule ?? null));
  // ...but a *manual* amount edit must recascade the ruled years below it, so the amounts do
  // need to be watched. Writing back is what makes this safe: the effect only replaces a row
  // whose amount actually changed *numerically*, so a half-typed or cleared field is left
  // exactly as the user left it (see `sameAmount`).
  const amountsKey = leaseYears.map((r) => r?.amount ?? '').join('|');

  // Materialize the lease_years array whenever the term intent changes. Length and
  // types always follow the steppers; amounts are formula-driven except in "custom"
  // mode, where each year's own rule prices it off the year before it and hand-typed
  // ("manual") amounts are preserved.
  useEffect(() => {
    const resetCpiAmounts = cpiSwitchRef.current;
    cpiSwitchRef.current = false;
    const rows = toModel(leaseYears);
    const next = buildLeaseYears(
      {
        contractYears: Number(contractStr) || 0,
        contractMonths: Number(contractMonthsStr) || 0,
        optionYears: Number(optionStr) || 0,
        optionMonths: Number(optionMonthsStr) || 0,
        baseRent: Number(baseRentStr) || 0,
        escalationMode: escMode,
        escalationValue: Number(escValStr) || 0,
      },
      rows,
      { resetCpiAmounts },
    );

    // Rebuilding the whole array remounts every row, so reserve it for changes that really
    // are structural (the steppers adding/removing years, or leaving custom mode with rules
    // still attached). Amount-only changes go through setValue on the leaf below — a replace()
    // there would tear down the rule inputs mid-keystroke and steal focus.
    const structureChanged =
      next.length !== leaseYears.length ||
      next.some(
        (y, i) => y.type !== leaseYears[i]?.type || (y.months ?? 12) !== (leaseYears[i]?.months ?? 12),
      );
    const staleRules = !isCustom && leaseYears.some((r) => r?.rule);

    if (structureChanged || staleRules) {
      replace(
        next.map((y, i) => ({
          amount: String(y.amount),
          type: y.type,
          ...(y.months ? { months: y.months } : {}),
          // buildLeaseYears only returns a rule in custom mode, so this drops them on exit.
          ...(y.rule && leaseYears[i]?.rule ? { rule: leaseYears[i].rule! } : {}),
        })),
      );
      return;
    }

    // Write only the amounts that actually changed *numerically* — comparing strings would
    // rewrite "" as "0" and fight the user's cursor mid-typing.
    next.forEach((y, i) => {
      if ((Number(leaseYears[i]?.amount) || 0) !== y.amount) {
        setValue(`leaseYears.${i}.amount`, String(y.amount), { shouldDirty: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contractStr,
    contractMonthsStr,
    optionStr,
    optionMonthsStr,
    baseRentStr,
    escMode,
    escValStr,
    rulesKey,
    amountsKey,
  ]);

  const termAnchorRef = useTourAnchor(ANCHORS.leaseTermBuilder);
  const baseRentAnchorRef = useTourAnchor(ANCHORS.leaseBaseRent);
  const yearRowsAnchorRef = useTourAnchor(ANCHORS.leaseYearRows);

  // `lease-form` is asked for by the drawer, not here: it covers the whole renter form now
  // and has to open on page one, before this component exists. The two elaborations below
  // stay, because they can only be reached from a control this component owns.
  //
  // Both are gated on the mode, so exactly one of them can ever open, and only once the user
  // has actually chosen it. Selecting a mode changes `rentMode`, which re-runs the request —
  // that is the whole trigger.
  useTour('cpi-mode', { rentMode: escMode });
  useTour('custom-mode', { rentMode: escMode });

  /** Rows in the numeric model, for deriving which years render as projections. */
  const modelRows = toModel(leaseYears);

  // Summed from the periods rather than the year stepper, so a short tail counts — and
  // so the option periods do too, which the old arithmetic silently dropped.
  let endDateISO: string | null = null;
  if (leaseStart && modelRows.length > 0) {
    const s = new Date(leaseStart);
    if (!isNaN(s.getTime())) {
      const months = modelRows.reduce((sum, y) => sum + periodMonths(y), 0);
      endDateISO = toISODate(addMonths(s, months));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={termAnchorRef} className="flex flex-wrap gap-4">
        <Controller
          control={control}
          name="contractTermYears"
          render={({ field }) => (
            <Stepper
              label={t('renter.contractTerm')}
              unitLabel={t('renter.yearsUnit')}
              min={0}
              max={20}
              value={Number(field.value) || 0}
              onChange={(v) => field.onChange(String(v))}
            />
          )}
        />

        <Controller
          control={control}
          name="contractTermMonths"
          render={({ field }) => (
            <Stepper
              label={t('renter.extraMonths')}
              unitLabel={t('renter.monthsUnit')}
              min={0}
              max={11}
              value={Number(field.value) || 0}
              onChange={(v) => field.onChange(String(v))}
            />
          )}
        />

        <Controller
          control={control}
          name="optionYears"
          render={({ field }) => (
            <Stepper
              label={t('renter.renewalOptions')}
              unitLabel={t('renter.yearsUnit')}
              min={0}
              max={10}
              value={Number(field.value) || 0}
              onChange={(v) => field.onChange(String(v))}
            />
          )}
        />

        <Controller
          control={control}
          name="optionTermMonths"
          render={({ field }) => (
            <Stepper
              label={t('renter.extraOptionMonths')}
              unitLabel={t('renter.monthsUnit')}
              min={0}
              max={11}
              value={Number(field.value) || 0}
              onChange={(v) => field.onChange(String(v))}
            />
          )}
        />
      </div>

      <div ref={baseRentAnchorRef}>
        <Controller
          control={control}
          name="baseRent"
          render={({ field, fieldState }) => (
            <FormInput
              label={t('renter.firstYearRent')}
              type="number"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="escalationMode"
        render={({ field: modeField }) => (
          <Controller
            control={control}
            name="escalationValue"
            render={({ field: valueField }) => (
              <RentChangeField
                label={t('renter.rentChange')}
                mode={(modeField.value as RentEscalationMode) ?? 'none'}
                onModeChange={(v) => {
                  if (v === 'cpi') cpiSwitchRef.current = true;
                  modeField.onChange(v);
                }}
                value={valueField.value ?? ''}
                onValueChange={valueField.onChange}
                onValueBlur={valueField.onBlur}
              />
            )}
          />
        )}
      />

      {leaseYears.length > 0 ? (
        <div ref={yearRowsAnchorRef}>
          <div className="h-px my-1 bg-[var(--color-outline)]" />
          <p className="text-sm font-medium mb-2 text-[var(--color-text-primary)]">
            {t('renter.leaseTimeline')}
          </p>

          <div className="flex flex-col gap-1.5">
            {leaseYears.map((row, index) => {
              const yearType: LeaseYearType = row?.type ?? 'contract';
              // Year 1 is the known base; later CPI years are index-linked projections.
              const isCpiProjected = escMode === 'cpi' && index > 0;

              return isCustom ? (
                // Two leaf Controllers rather than one on `leaseYears.${index}`: a Controller
                // bound to the item *object* doesn't re-render when the field array's value is
                // rewritten, so the recomputed amount never reaches the input.
                <Controller
                  key={index}
                  control={control}
                  name={`leaseYears.${index}.amount`}
                  render={({ field: amountField }) => (
                    <Controller
                      control={control}
                      name={`leaseYears.${index}.rule`}
                      render={({ field: ruleField, fieldState: ruleState }) => {
                        const rule = ruleField.value as LeaseYearRowValue['rule'];
                        const ruleMode = rule?.mode ?? 'manual';
                        const ruleError = (
                          ruleState.error as { value?: { message?: string } } | undefined
                        )?.value?.message;

                        return (
                          <LeaseYearRow
                            label={getLeaseYearLabel(leaseStart, modelRows, index, i18n.language)}
                            amount={amountField.value ?? ''}
                            type={yearType}
                            isCurrent={isCurrentLeaseYear(leaseStart, modelRows, index)}
                            projected={isProjectedYear(modelRows, index)}
                            amountName={amountField.name}
                            onAmountBlur={amountField.onBlur}
                            onAmountChange={(v) => {
                              amountField.onChange(v);
                              // Typing an amount means the stated rule no longer describes it —
                              // fall back to manual so the number and the rule can't disagree.
                              if (rule) ruleField.onChange(undefined);
                              // Year one *is* the first-year rent; keep the two in step, or the
                              // server (which prices year one off base_rent) would overwrite it.
                              if (index === 0) setValue('baseRent', v);
                            }}
                            // Year one is the base rent, so it has nothing to derive from.
                            ruleMode={ruleMode}
                            onRuleChange={
                              index === 0
                                ? undefined
                                : (mode) =>
                                    ruleField.onChange(
                                      mode === 'manual'
                                        ? undefined
                                        : { mode, value: rule?.value ?? '' },
                                    )
                            }
                            ruleValue={rule?.value ?? ''}
                            onRuleValueChange={(v) =>
                              ruleField.onChange({ mode: ruleMode, value: v })
                            }
                            error={ruleError}
                          />
                        );
                      }}
                    />
                  )}
                />
              ) : (
                <LeaseYearRow
                  key={index}
                  label={getLeaseYearLabel(leaseStart, modelRows, index, i18n.language)}
                  amount={String(row?.amount ?? '')}
                  type={yearType}
                  isCurrent={isCurrentLeaseYear(leaseStart, modelRows, index)}
                  projected={isCpiProjected}
                />
              );
            })}
          </div>

          {isCustom && isProjectedYear(modelRows, modelRows.length - 1) ? (
            <p className="text-[13px] leading-snug mt-2 text-[var(--color-text-secondary)]">
              {t('renter.cpiProjectedNote')}
            </p>
          ) : null}

          {endDateISO ? (
            <div
              className="flex items-center gap-1.5 mt-2 text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <CalendarClock size={15} />
              <span>{t('renter.leaseEnd', { date: fmtDate(endDateISO) })}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
