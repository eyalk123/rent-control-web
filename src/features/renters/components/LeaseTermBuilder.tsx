import { useEffect } from 'react';
import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import type { LeaseYearType, RentEscalationMode } from '@/shared/types';
import type { RenterFormValues } from '../validation/renterValidation';
import { getLeaseYearLabel, isCurrentLeaseYear } from '@/shared/utils/leaseYear';
import { buildLeaseYears } from '@/shared/utils/leaseSchedule';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { Stepper } from '@/shared/components/ui/Stepper';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { Pill } from '@/shared/components/ui/Pill';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { FormInput } from '@/shared/components/form/FormInput';

interface Props {
  control: Control<RenterFormValues>;
}

type LeaseYearRow = { amount?: string; type?: LeaseYearType };

export function LeaseTermBuilder({ control }: Props) {
  const { t } = useTranslation();

  const contractStr = useWatch({ control, name: 'contractTermYears' }) as string | undefined;
  const optionStr = useWatch({ control, name: 'optionYears' }) as string | undefined;
  const baseRentStr = useWatch({ control, name: 'baseRent' }) as string | undefined;
  const escMode =
    (useWatch({ control, name: 'escalationMode' }) as RentEscalationMode | undefined) ?? 'none';
  const escValStr = useWatch({ control, name: 'escalationValue' }) as string | undefined;
  const leaseStart = useWatch({ control, name: 'leaseStart' }) as string | undefined;
  const leaseYears = (useWatch({ control, name: 'leaseYears' }) as LeaseYearRow[] | undefined) ?? [];

  const { replace } = useFieldArray({ control, name: 'leaseYears' });

  // Materialize the lease_years array whenever the term intent changes. Length and
  // types always follow the steppers; amounts are formula-driven except in
  // "custom" mode, where existing per-year amounts/types are preserved. The effect
  // intentionally depends only on the intent scalars: it must NOT re-run when the
  // user edits a row in custom mode (that would clobber their value), and the
  // `leaseYears` it reads is the fresh value from whichever render last changed a
  // scalar — exactly the rows we want to preserve.
  useEffect(() => {
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

  const escalationSegments: { value: RentEscalationMode; label: string }[] = [
    { value: 'none', label: t('renter.rentChangeSame') },
    { value: 'percent', label: t('renter.rentChangePercent') },
    { value: 'fixed', label: t('renter.rentChangeFixed') },
    { value: 'custom', label: t('renter.rentChangeCustom') },
  ];

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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {t('renter.rentChange')}
        </span>
        <Controller
          control={control}
          name="escalationMode"
          render={({ field }) => (
            <SegToggle
              value={(field.value as RentEscalationMode) ?? 'none'}
              onChange={(v) => field.onChange(v)}
              options={escalationSegments}
            />
          )}
        />
      </div>

      {escMode === 'percent' || escMode === 'fixed' ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t('renter.yearlyIncrease')}
          </span>
          <Controller
            control={control}
            name="escalationValue"
            render={({ field }) => (
              <div
                className="inline-flex items-center rounded-xl border bg-[var(--color-input-bg)] px-3 h-10 w-32"
                style={{ borderColor: 'var(--color-input-border)' }}
              >
                {escMode === 'fixed' && (
                  <span className="text-sm text-[var(--color-text-secondary)] me-1">₪</span>
                )}
                <input
                  type="number"
                  dir="ltr"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="0"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--color-text-primary)]"
                />
                {escMode === 'percent' && (
                  <span className="text-sm text-[var(--color-text-secondary)] ms-1">%</span>
                )}
              </div>
            )}
          />
        </div>
      ) : null}

      {leaseYears.length > 0 ? (
        <div>
          <div className="h-px my-1 bg-[var(--color-outline)]" />
          <p className="text-sm font-medium mb-2 text-[var(--color-text-primary)]">
            {t('renter.leaseTimeline')}
          </p>

          <div>
            {leaseYears.map((row, index) => {
              const isCurrent = isCurrentLeaseYear(leaseStart, index);
              const yearType: LeaseYearType = row?.type ?? 'contract';
              const amountNum = Number(row?.amount) || 0;
              const isFirst = index === 0;
              const isLast = index === leaseYears.length - 1;

              return (
                <div
                  key={index}
                  className={`flex items-stretch gap-2 px-1 ${isCurrent ? 'rounded-[8px]' : ''}`}
                  style={isCurrent ? { background: 'var(--color-rev-bg)' } : undefined}
                >
                  {/* connected rail */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div
                      className="w-0.5 flex-1"
                      style={{ background: isFirst ? 'transparent' : 'var(--color-outline)' }}
                    />
                    <div
                      className="rounded-full my-0.5 shrink-0"
                      style={{
                        width: isCurrent ? 14 : 12,
                        height: isCurrent ? 14 : 12,
                        background: isCurrent
                          ? 'var(--color-rev-fg)'
                          : yearType === 'option'
                          ? 'transparent'
                          : 'var(--color-primary)',
                        border:
                          yearType === 'option' && !isCurrent
                            ? '2px solid var(--color-primary)'
                            : 'none',
                      }}
                    />
                    <div
                      className="w-0.5 flex-1"
                      style={{ background: isLast ? 'transparent' : 'var(--color-outline)' }}
                    />
                  </div>

                  {isCustom ? (
                    <div className="flex-1 flex items-center gap-3 py-2">
                      <span
                        className={`text-[15px] min-w-[52px] text-[var(--color-text-primary)] ${
                          isCurrent ? 'font-extrabold' : 'font-semibold'
                        }`}
                      >
                        {getLeaseYearLabel(leaseStart, index)}
                      </span>
                      <Controller
                        control={control}
                        name={`leaseYears.${index}.amount`}
                        render={({ field }) => (
                          <input
                            type="number"
                            dir="ltr"
                            placeholder={t('renter.amount')}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            className="flex-1 min-w-0 rounded-lg border bg-[var(--color-input-bg)] px-2.5 h-9 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)]"
                            style={{ borderColor: 'var(--color-input-border)' }}
                          />
                        )}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color:
                            yearType === 'option'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-secondary)',
                        }}
                      >
                        {yearType === 'contract' ? t('renter.contract') : t('renter.option')}
                      </span>
                      {isCurrent && (
                        <Pill tone="revenue" size="sm">
                          {t('renter.currentLease')}
                        </Pill>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-3 py-2.5">
                      <span
                        className={`text-[15px] min-w-[52px] text-[var(--color-text-primary)] ${
                          isCurrent ? 'font-extrabold' : 'font-semibold'
                        }`}
                      >
                        {getLeaseYearLabel(leaseStart, index)}
                      </span>
                      <LtrSpan
                        className="flex-1 text-[15px] font-semibold text-[var(--color-text-primary)]"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {amountNum > 0 ? formatMoney(amountNum) : '—'}
                      </LtrSpan>
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color:
                            yearType === 'option'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-secondary)',
                        }}
                      >
                        {yearType === 'contract' ? t('renter.contract') : t('renter.option')}
                      </span>
                      {isCurrent && (
                        <Pill tone="revenue" size="sm">
                          {t('renter.currentLease')}
                        </Pill>
                      )}
                    </div>
                  )}
                </div>
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
