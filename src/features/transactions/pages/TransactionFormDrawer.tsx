import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUpdateRevenueTransaction,
  useUpdateExpenseTransaction,
  useExpenseCategories,
  usePropertyRenters,
  transactionKeys,
} from '../queries';
import { createRevenueTransaction, createExpenseTransaction } from '../api/transactions';
import { useProperties } from '@/features/properties/queries';
import { useSuppliers } from '@/features/suppliers/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { PropertyMultiSelect } from '@/shared/components/form/PropertyMultiSelect';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { MonthGridPicker } from '@/shared/components/ui/MonthGridPicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { PAYMENT_METHOD_VALUES } from '@/shared/constants/paymentMethods';
import { formatMoney } from '@/shared/utils/money';
import {
  type PeriodType,
  getMonthsForPeriod,
  getContractYearMonths,
  getCurrentPeriodValue,
  getRentForMonth,
  YEAR_OPTIONS,
} from '../utils/periodUtils';
import type { Transaction, Renter } from '@/shared/types';

type TxType = 'revenue' | 'expense';

// ─── Enriched renter (knows which property it came from) ─────────────────────

interface RenterWithProperty extends Renter {
  propertyId: number;
  propertyLabel: string;
}

// ─── Revenue Form ─────────────────────────────────────────────────────────────

interface RevenueEditFields {
  renterId: string;
  amount: string;
  monthFor: string;
  dateOfPayment: string;
  paymentMethod: string;
  notes: string;
}

interface RevenueFormProps {
  onClose: () => void;
  transaction?: Transaction;
}

function RevenueForm({ onClose, transaction }: RevenueFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const qc = useQueryClient();
  const updateRevenue = useUpdateRevenueTransaction(transaction?.id ?? 0);
  const { showToast } = useToast();

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const { data: editRenters } = usePropertyRenters(transaction?.property_id ?? null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<RevenueEditFields>({
    defaultValues: {
      renterId: transaction?.renter_id?.toString() ?? '__none__',
      amount: transaction?.amount?.toString() ?? '',
      monthFor: transaction?.month_for?.slice(0, 7) ?? '',
      dateOfPayment: transaction?.date_of_payment ?? '',
      paymentMethod: transaction?.payment_method ?? '',
      notes: transaction?.notes ?? '',
    },
  });

  const paymentOptions = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));
  const renterOptions = (editRenters ?? []).map((r) => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }));

  const onEditSubmit = handleSubmit(async (data) => {
    try {
      await updateRevenue.mutateAsync({
        renter_id: data.renterId && data.renterId !== '__none__' ? Number(data.renterId) : null,
        amount: Number(data.amount),
        date_of_payment: data.dateOfPayment,
        month_for: data.monthFor ? `${data.monthFor}-01` : undefined,
        payment_method: (data.paymentMethod || undefined) as never,
        notes: data.notes || null,
      });
      showToast(t('transactions.updateSuccess'), 'success');
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  // ── Bulk create mode state ─────────────────────────────────────────────────
  const [periodType, setPeriodType] = useState<PeriodType>('1month');
  const [periodValue, setPeriodValue] = useState(() => getCurrentPeriodValue('1month'));
  const [customMonths, setCustomMonths] = useState<Set<string>>(new Set());
  const [gridYear, setGridYear] = useState(() => new Date().getFullYear());
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [allRenters, setAllRenters] = useState<RenterWithProperty[]>([]);
  const [selectedRenterIds, setSelectedRenterIds] = useState<Set<number>>(new Set());
  const [overrideAmounts, setOverrideAmounts] = useState<Record<number, string>>({});
  const [overriddenIds, setOverriddenIds] = useState<Set<number>>(new Set());
  const [bulkDate, setBulkDate] = useState('');
  const [bulkPayment, setBulkPayment] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [propertyError, setPropertyError] = useState('');
  const [renterError, setRenterError] = useState('');

  useEffect(() => {
    if (periodType !== 'custom') setPeriodValue(getCurrentPeriodValue(periodType));
  }, [periodType]);

  useEffect(() => {
    if (selectedPropertyIds.length === 0) { setAllRenters([]); return; }
    const enriched = selectedPropertyIds.flatMap((pid) => {
      const prop = (properties ?? []).find((p) => p.id === pid);
      const label = prop ? `${prop.address}, ${prop.city}` : `#${pid}`;
      return (prop?.renters ?? []).map((r) => ({ ...r, propertyId: pid, propertyLabel: label }));
    });
    setAllRenters(enriched);
  }, [selectedPropertyIds, properties]);

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id, label: `${p.address}, ${p.city}` }));
  const allRenterIds = allRenters.map((r) => r.id);

  function toggleRenter(renter: RenterWithProperty) {
    setSelectedRenterIds((prev) => {
      const next = new Set(prev);
      if (next.has(renter.id)) {
        next.delete(renter.id);
      } else {
        next.add(renter.id);
        setOverrideAmounts((am) => {
          if (am[renter.id] !== undefined) return am;
          return { ...am, [renter.id]: String(renter.lease_years?.[0]?.amount || '') };
        });
      }
      return next;
    });
  }

  function toggleAllRenters() {
    if (selectedRenterIds.size === allRenters.length) {
      setSelectedRenterIds(new Set());
    } else {
      setSelectedRenterIds(new Set(allRenterIds));
      setOverrideAmounts((am) => {
        const next = { ...am };
        for (const r of allRenters) {
          if (next[r.id] === undefined) next[r.id] = String(r.lease_years?.[0]?.amount || '');
        }
        return next;
      });
    }
  }

  function toggleOverride(id: number) {
    setOverriddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkSubmit() {
    setPropertyError('');
    setRenterError('');
    if (selectedPropertyIds.length === 0) { setPropertyError(t('transactions.selectProperties')); return; }
    if (selectedRenterIds.size === 0) { setRenterError(t('transactions.bulkRevenue.noSelectionError')); return; }
    if (periodType === 'custom' && customMonths.size === 0) { setRenterError(t('transactions.bulkRevenue.noMonthsError')); return; }
    if (!bulkDate) return;

    const checkedRenters = allRenters.filter((r) => selectedRenterIds.has(r.id));

    const payloads = checkedRenters.flatMap((renter) => {
      const months = periodType === 'year'
        ? getContractYearMonths(Number(periodValue), renter.lease_start ?? '')
        : periodType === 'custom'
        ? [...customMonths].sort()
        : getMonthsForPeriod(periodType, periodValue);
      const overrideAmount = overriddenIds.has(renter.id)
        ? Number(overrideAmounts[renter.id])
        : null;
      return months.map((monthFor) => ({
        property_id: renter.propertyId,
        renter_id: renter.id,
        amount: overrideAmount ?? getRentForMonth(renter, monthFor),
        date_of_payment: bulkDate,
        month_for: monthFor,
        payment_method: (bulkPayment || undefined) as never,
        notes: bulkNotes || undefined,
      }));
    });

    setBulkSubmitting(true);
    try {
      const results = await Promise.allSettled(payloads.map((p) => createRevenueTransaction(p)));
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      const failed = results.filter((r) => r.status === 'rejected').length;
      const success = results.length - failed;
      if (failed === 0) {
        showToast(t('transactions.createBulkSuccess', { count: success }), 'success');
      } else {
        showToast(t('transactions.bulkRevenue.partialError', { success, failed }), 'error');
      }
      onClose();
    } finally {
      setBulkSubmitting(false);
    }
  }

  // ── Edit mode render ───────────────────────────────────────────────────────
  if (transaction) {
    const propertyLabel = transaction.property_name || `#${transaction.property_id}`;
    return (
      <form id="transaction-form" onSubmit={onEditSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('transactions.property')}</label>
          <div className="flex items-center h-[42px] rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 text-sm text-[var(--color-text-secondary)]">
            {propertyLabel}
          </div>
        </div>
        <Controller control={control} name="renterId" render={({ field }) => (
          <FormSelect label={t('transactions.selectRenter')} value={field.value} onValueChange={field.onChange} options={[{ value: '__none__', label: t('transactions.selectRenter') }, ...renterOptions]} placeholder={t('transactions.selectRenter')} />
        )} />
        <FormInput label={t('transactions.amount')} type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: true })} />
        <FormInput label={t('transactions.monthFor')} type="month" error={errors.monthFor?.message} {...register('monthFor', { required: true })} />
        <FormDateInput label={t('transactions.date')} error={errors.dateOfPayment?.message} {...register('dateOfPayment', { required: true })} />
        <Controller control={control} name="paymentMethod" render={({ field }) => (
          <FormSelect label={t('transactions.paymentMethod')} value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} />
        )} />
        <FormInput label={t('transactions.notes')} {...register('notes')} />
      </form>
    );
  }

  // ── Bulk create render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Period type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('transactions.bulkRevenue.timePeriod')}</label>
        <SegToggle
          value={periodType}
          onChange={(v) => setPeriodType(v as PeriodType)}
          options={[
            { value: '1month', label: t('transactions.bulkRevenue.oneMonth') },
            { value: 'custom', label: t('transactions.bulkRevenue.custom') },
            { value: 'year', label: t('transactions.bulkRevenue.contractYear') },
          ]}
          size="sm"
        />
      </div>

      {/* Period value */}
      {periodType === '1month' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('transactions.bulkRevenue.oneMonth')}</label>
          <input
            type="month"
            value={periodValue}
            onChange={(e) => setPeriodValue(e.target.value)}
            className="w-full h-[42px] rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      )}
      {periodType === 'custom' && (
        <MonthGridPicker
          selectedMonths={customMonths}
          onToggle={(m) => setCustomMonths((prev) => { const next = new Set(prev); next.has(m) ? next.delete(m) : next.add(m); return next; })}
          gridYear={gridYear}
          onGridYearChange={setGridYear}
        />
      )}
      {periodType === 'year' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('transactions.bulkRevenue.contractYear')}</label>
          <select
            value={periodValue}
            onChange={(e) => setPeriodValue(e.target.value)}
            className="w-full h-[42px] rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          >
            {YEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* Properties */}
      <PropertyMultiSelect
        label={t('transactions.property')}
        options={propertyOptions}
        selectedIds={selectedPropertyIds}
        onChange={(ids) => { setSelectedPropertyIds(ids); setSelectedRenterIds(new Set()); setOverrideAmounts({}); setOverriddenIds(new Set()); }}
        error={propertyError}
        placeholder={t('transactions.selectProperties')}
      />

      {/* Payment details */}
      <FormDateInput
        label={t('transactions.date')}
        value={bulkDate}
        onChange={(e) => setBulkDate((e as React.ChangeEvent<HTMLInputElement>).target.value)}
      />
      <FormSelect
        label={t('transactions.paymentMethod')}
        value={bulkPayment}
        onValueChange={setBulkPayment}
        options={paymentOptions}
        placeholder={t('transactions.selectPaymentMethod')}
      />
      <FormInput
        label={t('transactions.notes')}
        value={bulkNotes}
        onChange={(e) => setBulkNotes((e as React.ChangeEvent<HTMLInputElement>).target.value)}
      />

      {/* Renter checklist */}
      {selectedPropertyIds.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t('transactions.bulkRevenue.tenantsSection')}</span>
            {allRenters.length > 0 && (
              <button type="button" onClick={toggleAllRenters} className="text-[12px] font-medium" style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {selectedRenterIds.size === allRenters.length ? t('transactions.bulkRevenue.deselectAll') : t('transactions.bulkRevenue.selectAll')}
              </button>
            )}
          </div>
          {renterError && <p className="text-xs text-[var(--color-error)]">{renterError}</p>}
          {allRenters.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{t('transactions.bulkRevenue.noContracts')}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {allRenters.map((renter) => {
                const checked = selectedRenterIds.has(renter.id);
                const overridden = overriddenIds.has(renter.id);
                const overrideAmount = overrideAmounts[renter.id] ?? '';
                return (
                  <div
                    key={renter.id}
                    className="rounded-[10px] border px-4 py-2.5"
                    style={{ borderColor: 'var(--color-outline)', background: checked ? 'var(--color-input-filled-background)' : 'var(--color-surface)' }}
                  >
                    {/* Top row: checkbox + name + "Per contract" when unchecked */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRenter(renter)}
                        className="h-4 w-4 shrink-0 rounded accent-[var(--color-primary)] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                          {renter.first_name} {renter.last_name}
                        </p>
                        {selectedPropertyIds.length > 1 && (
                          <p className="text-[11px] text-[var(--color-text-secondary)] truncate">{renter.propertyLabel}</p>
                        )}
                      </div>
                      {!checked && (
                        <span className="text-[12px] text-[var(--color-text-secondary)] shrink-0">
                          {t('transactions.bulkRevenue.perContract')}
                        </span>
                      )}
                    </div>

                    {/* Amount row when checked */}
                    {checked && (
                      <div className="flex items-center gap-2 mt-2 ps-7">
                        {overridden ? (
                          <>
                            <input
                              type="number"
                              value={overrideAmount}
                              onChange={(e) => setOverrideAmounts((prev) => ({ ...prev, [renter.id]: e.target.value }))}
                              className="flex-1 h-8 rounded-[8px] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] text-end"
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                              placeholder="0"
                              step="0.01"
                            />
                            <button
                              type="button"
                              onClick={() => toggleOverride(renter.id)}
                              className="shrink-0 px-3 py-1 rounded-full text-[12px] font-medium border"
                              style={{ borderColor: 'var(--color-outline)', color: 'var(--color-text-secondary)' }}
                            >
                              {t('transactions.bulkRevenue.auto')}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="flex-1 text-[12px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                              {t('transactions.bulkRevenue.perContract')}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleOverride(renter.id)}
                              className="shrink-0 px-3 py-1 rounded-full text-[12px] font-medium border"
                              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                            >
                              {t('transactions.bulkRevenue.override')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bulk submit button rendered via the drawer footer (id="transaction-form-bulk") */}
      <button
        id="bulk-revenue-submit"
        type="button"
        className="hidden"
        onClick={handleBulkSubmit}
        disabled={bulkSubmitting}
      />
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

interface ExpenseEditFields {
  renterId: string;
  amount: string;
  dateOfPayment: string;
  categoryId: string;
  supplierId: string;
  paymentMethod: string;
  notes: string;
}

interface ExpenseFormProps {
  onClose: () => void;
  transaction?: Transaction;
}

function ExpenseForm({ onClose, transaction }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const { data: categories } = useExpenseCategories();
  const qc = useQueryClient();
  const updateExpense = useUpdateExpenseTransaction(transaction?.id ?? 0);
  const { showToast } = useToast();

  // ── Shared state for both modes ────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(transaction?.category_id ?? null);

  // ── Create mode state ──────────────────────────────────────────────────────
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [propertyError, setPropertyError] = useState('');

  const singlePropertyId = selectedPropertyIds.length === 1 ? selectedPropertyIds[0] : null;
  const { data: createRenters } = usePropertyRenters(singlePropertyId);

  // ── Edit mode renter data ──────────────────────────────────────────────────
  const { data: editRenters } = usePropertyRenters(transaction?.property_id ?? null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ExpenseEditFields>({
    defaultValues: {
      renterId: transaction?.renter_id?.toString() ?? '__none__',
      amount: transaction?.amount?.toString() ?? '',
      dateOfPayment: transaction?.date_of_payment ?? '',
      categoryId: transaction?.category_id?.toString() ?? '',
      supplierId: transaction?.supplier_id?.toString() ?? '',
      paymentMethod: transaction?.payment_method ?? '',
      notes: transaction?.notes ?? '',
    },
  });

  const watchedAmount = watch('amount');

  const { data: suppliers } = useSuppliers({ categoryId: selectedCategoryId ?? undefined });

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id, label: `${p.address}, ${p.city}` }));
  const categoryOptions = (categories ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id.toString(), label: c.name ?? c.key ?? String(c.id) }));
  const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id.toString(), label: s.name }));
  const paymentOptions = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  const createRenterOptions = (createRenters ?? []).map((r) => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }));
  const editRenterOptions = (editRenters ?? []).map((r) => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }));

  const onEditSubmit = handleSubmit(async (data) => {
    if (!data.categoryId) return;
    try {
      await updateExpense.mutateAsync({
        renter_id: data.renterId && data.renterId !== '__none__' ? Number(data.renterId) : null,
        amount: Number(data.amount),
        date_of_payment: data.dateOfPayment,
        payment_method: data.paymentMethod as never,
        category_id: Number(data.categoryId),
        supplier_id: data.supplierId ? Number(data.supplierId) : null,
        notes: data.notes || null,
      });
      showToast(t('transactions.updateSuccess'), 'success');
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  // ── Create mode submit ─────────────────────────────────────────────────────
  const handleBulkCreate = handleSubmit(async (data) => {
    setPropertyError('');
    if (selectedPropertyIds.length === 0) { setPropertyError(t('transactions.selectProperties')); return; }
    if (!data.categoryId) return;

    const perAmount = Number(data.amount) / selectedPropertyIds.length;
    const renterId = selectedPropertyIds.length === 1 && data.renterId && data.renterId !== '__none__' ? Number(data.renterId) : null;

    const payloads = selectedPropertyIds.map((pid) => ({
      property_id: pid,
      renter_id: renterId,
      amount: perAmount,
      date_of_payment: data.dateOfPayment,
      payment_method: data.paymentMethod as never,
      category_id: Number(data.categoryId),
      supplier_id: data.supplierId ? Number(data.supplierId) : null,
      notes: data.notes || undefined,
    }));

    try {
      const results = await Promise.allSettled(payloads.map((p) => createExpenseTransaction(p)));
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      const failed = results.filter((r) => r.status === 'rejected').length;
      const success = results.length - failed;
      if (failed === 0) {
        showToast(t('transactions.createBulkSuccess', { count: success }), 'success');
      } else {
        showToast(t('transactions.bulkRevenue.partialError', { success, failed }), 'error');
      }
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  // ── Edit mode render ───────────────────────────────────────────────────────
  if (transaction) {
    const propertyLabel = transaction.property_name || `#${transaction.property_id}`;
    return (
      <form id="transaction-form" onSubmit={onEditSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('transactions.property')}</label>
          <div className="flex items-center h-[42px] rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 text-sm text-[var(--color-text-secondary)]">
            {propertyLabel}
          </div>
        </div>
        <Controller control={control} name="renterId" render={({ field }) => (
          <FormSelect label={t('transactions.selectRenter')} value={field.value} onValueChange={field.onChange} options={[{ value: '__none__', label: t('transactions.selectRenter') }, ...editRenterOptions]} placeholder={t('transactions.selectRenter')} />
        )} />
        <FormInput label={t('transactions.amount')} type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: true })} />
        <FormDateInput label={t('transactions.date')} error={errors.dateOfPayment?.message} {...register('dateOfPayment', { required: true })} />
        <Controller control={control} name="categoryId" render={({ field }) => (
          <FormSelect
            label={t('transactions.category')}
            value={field.value}
            onValueChange={(v) => { field.onChange(v); setSelectedCategoryId(Number(v)); }}
            options={categoryOptions}
            placeholder={t('transactions.selectCategory')}
            error={errors.categoryId?.message}
          />
        )} />
        {selectedCategoryId && supplierOptions.length > 0 && (
          <Controller control={control} name="supplierId" render={({ field }) => (
            <FormSelect label={t('transactions.supplier')} value={field.value} onValueChange={field.onChange} options={supplierOptions} placeholder={t('transactions.selectSupplier')} />
          )} />
        )}
        <Controller control={control} name="paymentMethod" render={({ field }) => (
          <FormSelect label={t('transactions.paymentMethod')} value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} />
        )} />
        <FormInput label={t('transactions.notes')} {...register('notes')} />
      </form>
    );
  }

  // ── Create mode render ─────────────────────────────────────────────────────
  const totalAmount = Number(watchedAmount);
  const showSplit = selectedPropertyIds.length > 1 && totalAmount > 0;
  const perPropertyAmount = showSplit ? totalAmount / selectedPropertyIds.length : 0;
  const renterDisabled = selectedPropertyIds.length !== 1;

  return (
    <form id="transaction-form" onSubmit={handleBulkCreate} className="space-y-4">
      <PropertyMultiSelect
        label={t('transactions.property')}
        options={propertyOptions}
        selectedIds={selectedPropertyIds}
        onChange={(ids) => { setSelectedPropertyIds(ids); setPropertyError(''); }}
        error={propertyError}
        placeholder={t('transactions.selectProperties')}
      />

      <div className="flex flex-col gap-1.5">
        <FormInput
          label={t('transactions.amount')}
          type="number"
          step="0.01"
          error={errors.amount?.message}
          {...register('amount', { required: true })}
        />
        {showSplit && (
          <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('transactions.splitHint', { count: selectedPropertyIds.length, amount: formatMoney(perPropertyAmount) })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Controller control={control} name="renterId" render={({ field }) => (
          <FormSelect
            label={t('transactions.selectRenter')}
            value={field.value}
            onValueChange={field.onChange}
            options={[{ value: '__none__', label: t('transactions.selectRenter') }, ...createRenterOptions]}
            placeholder={t('transactions.selectRenter')}
            disabled={renterDisabled}
          />
        )} />
        {renterDisabled && selectedPropertyIds.length > 1 && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{t('transactions.renterDisabledHint')}</p>
        )}
      </div>

      <FormDateInput label={t('transactions.date')} error={errors.dateOfPayment?.message} {...register('dateOfPayment', { required: true })} />
      <Controller control={control} name="categoryId" render={({ field }) => (
        <FormSelect
          label={t('transactions.category')}
          value={field.value}
          onValueChange={(v) => { field.onChange(v); setSelectedCategoryId(Number(v)); }}
          options={categoryOptions}
          placeholder={t('transactions.selectCategory')}
          error={errors.categoryId?.message}
        />
      )} />
      {selectedCategoryId && supplierOptions.length > 0 && (
        <Controller control={control} name="supplierId" render={({ field }) => (
          <FormSelect label={t('transactions.supplier')} value={field.value} onValueChange={field.onChange} options={supplierOptions} placeholder={t('transactions.selectSupplier')} />
        )} />
      )}
      <Controller control={control} name="paymentMethod" render={({ field }) => (
        <FormSelect label={t('transactions.paymentMethod')} value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} />
      )} />
      <FormInput label={t('transactions.notes')} {...register('notes')} />
    </form>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  initialType?: TxType;
  initialPropertyId?: number;
  transaction?: Transaction;
}

export function TransactionFormDrawer({ open, onClose, initialType, transaction }: Props) {
  const { t } = useTranslation();
  const editType = transaction?.type as TxType | undefined;
  const [txType, setTxType] = useState<TxType | null>(editType ?? initialType ?? null);

  useEffect(() => {
    if (!open) setTxType(editType ?? initialType ?? null);
    else if (editType ?? initialType) setTxType(editType ?? initialType ?? null);
  }, [open, initialType, editType]);

  const isEditing = !!transaction;
  const isBulkRevenue = !isEditing && txType === 'revenue';

  const saveButton = (
    <button
      type={isBulkRevenue ? 'button' : 'submit'}
      form={isBulkRevenue ? undefined : 'transaction-form'}
      onClick={isBulkRevenue ? () => document.getElementById('bulk-revenue-submit')?.click() : undefined}
      className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      style={{ background: 'var(--color-primary)' }}
    >
      {t('common.save')}
    </button>
  );

  const footer = txType ? (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => { if (isEditing || initialType) onClose(); else setTxType(null); }}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {isEditing || initialType ? t('common.cancel') : t('common.back')}
      </button>
      {saveButton}
    </div>
  ) : (
    <button
      type="button"
      onClick={onClose}
      className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
      style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
    >
      {t('common.cancel')}
    </button>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t('transactions.editTransaction') : t('transactions.addNew')}
      width={640}
      footer={footer}
    >
      {!txType ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTxType('revenue')}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 transition-colors"
            style={{ border: '2px solid var(--color-rev-fg)', background: 'var(--color-rev-bg)', opacity: 0.85 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            <TrendingUp size={28} style={{ color: 'var(--color-rev-fg)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-rev-fg)' }}>{t('transactions.revenue')}</span>
          </button>
          <button
            onClick={() => setTxType('expense')}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 transition-colors"
            style={{ border: '2px solid var(--color-exp-fg)', background: 'var(--color-exp-bg)', opacity: 0.85 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            <TrendingDown size={28} style={{ color: 'var(--color-exp-fg)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>{t('transactions.expense')}</span>
          </button>
        </div>
      ) : txType === 'revenue' ? (
        <RevenueForm onClose={onClose} transaction={transaction} />
      ) : (
        <ExpenseForm onClose={onClose} transaction={transaction} />
      )}
    </Drawer>
  );
}
