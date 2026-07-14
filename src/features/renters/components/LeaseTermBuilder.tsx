import { useEffect, useRef } from 'react';
import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import type { LeaseYearType, RentEscalationMode } from '@/shared/types';
import type { RenterFormValues } from '../validation/renterValidation';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { buildLeaseYears } from '@/shared/utils/leaseSchedule';
import { fmtDate } from '@/shared/utils/dates';
import { Stepper } from '@/shared/components/ui/Stepper';
import { FormInput } from '@/shared/components/form/FormInput';
import { RentChangeField } from '@/shared/components/lease/RentChangeField';
import { LeaseYearRow } from '@/shared/components/lease/LeaseYearRow';

interface Props {
  control: Control<RenterFormValues>;
}

type LeaseYearRowValue = { amount?: string; type?: LeaseYearType };

export function LeaseTermBuilder({ control }: Props) {
  const { t } = useTranslation();

  const contractStr = useWatch({ control, name: 'contractTermYears' }) as string | undefined;
  const optionStr = useWatch({ control, name: 'optionYears' }) as string | undefined;
  const baseRentStr = useWatch({ control, name: 'baseRent' }) as string | undefined;
  const escMode =
    (useWatch({ control, name: 'escalationMode' }) as RentEscalationMode | undefined) ?? 'none';
  const escValStr = useWatch({ control, name: 'escalationValue' }) as string | undefined;
  const leaseStart = useWatch({ control, name: 'leaseStart' }) as string | undefined;
  const leaseYears =
    (useWatch({ control, name: 'leaseYears' }) as LeaseYearRowValue[] | undefined) ?? [];

  const { replace } = useFieldArray({ control, name: 'leaseYears' });

  // Set when the user actively switches *into* CPI via the escalation toggle (never
  // on edit-hydration, which flows through form reset()). Signals the effect to drop
  // the outgoing mode's amounts and project the flat base instead of preserving them.
  const cpiSwitchRef = useRef(false);

  // Materialize the lease_years array whenever the term intent changes. Length and
  // types always follow the steppers; amounts are formula-driven except in
  // "custom" mode, where existing per-year amounts/types are preserved. The effect
  // intentionally depends only on the intent scalars: it must NOT re-run when the
  // user edits a row in custom mode (that would clobber their value), and the
  // `leaseYears` it reads is the fresh value from whichever render last changed a
  // scalar — exactly the rows we want to preserve.
  useEffect(() => {
    const resetCpiAmounts = cpiSwitchRef.current;
    cpiSwitchRef.current = false;
    const next = buildLeaseYears(
      {
        contractYears: Number(contractStr) || 0,
        optionYears: Number(optionStr) || 0,
        baseRent: Number(baseRentStr) || 0,
        escalationMode: escMode,
        escalationValue: Number(escValStr) || 0,
      },
      leaseYears.map((r) => ({
        amount: Number(r?.amount) || 0,
        type: r?.type ?? 'contract',
      })),
      { resetCpiAmounts },
    );
    const same =
      next.length === leaseYears.length &&
      next.every(
        (n, i) =>
          String(n.amount) === String(leaseYears[i]?.amount ?? '') && n.type === leaseYears[i]?.type,
      );
    if (!same) {
      replace(next.map((y) => ({ amount: String(y.amount), type: y.type })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractStr, optionStr, baseRentStr, escMode, escValStr]);

  const isCustom = escMode === 'custom';

  const contractCount = Number(contractStr) || 0;
  let endDateISO: string | null = null;
  if (leaseStart && contractCount > 0) {
    const s = new Date(leaseStart);
    if (!isNaN(s.getTime())) {
      const end = new Date(s.getFullYear() + contractCount, s.getMonth(), s.getDate());
      endDateISO = end.toISOString().split('T')[0];
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
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
      </div>

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
        <div>
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
                <Controller
                  key={index}
                  control={control}
                  name={`leaseYears.${index}.amount`}
                  render={({ field }) => (
                    <LeaseYearRow
                      label={getLeaseYearLabel(leaseStart, index)}
                      amount={field.value ?? ''}
                      type={yearType}
                      isCurrent={isCurrentLeaseYear(leaseStart, index)}
                      onAmountChange={field.onChange}
                      onAmountBlur={field.onBlur}
                      amountName={field.name}
                    />
                  )}
                />
              ) : (
                <LeaseYearRow
                  key={index}
                  label={getLeaseYearLabel(leaseStart, index)}
                  amount={String(row?.amount ?? '')}
                  type={yearType}
                  isCurrent={isCurrentLeaseYear(leaseStart, index)}
                  projected={isCpiProjected}
                />
              );
            })}
          </div>

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
