import { useState, useEffect, useMemo } from 'react';
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
import { createRevenueTransaction, createExpenseTransaction, updateExpenseTransaction } from '../api/transactions';
import { useAppAuth } from '@/core/auth/AuthContext';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { useProperties } from '@/features/properties/queries';
import { useSuppliers } from '@/features/suppliers/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormFileInput } from '@/shared/components/form/FormFileInput';
import { WheelDatePicker } from '@/shared/components/form/WheelDatePicker';
import { PropertyMultiSelect } from '@/shared/components/form/PropertyMultiSelect';
import { RequiredMark } from '@/shared/components/form/RequiredMark';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { MonthGridPicker } from '@/shared/components/ui/MonthGridPicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { PAYMENT_METHOD_VALUES } from '@/shared/constants/paymentMethods';
import { formatMoney } from '@/shared/utils/money';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { CategoryMultiSelect } from '../components/CategoryMultiSelect';
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
  onDirtyChange: (dirty: boolean) => void;
}

function RevenueForm({ onClose, transaction, onDirtyChange }: RevenueFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const qc = useQueryClient();
  const updateRevenue = useUpdateRevenueTransaction(transaction?.id ?? 0);
  const { showToast } = useToast();

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const { data: editRenters } = usePropertyRenters(transaction?.property_id ?? null);
  const { register, handleSubmit, control, formState: { errors, isDirty } } = useForm<RevenueEditFields>({
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
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
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
  const [bulkDateError, setBulkDateError] = useState('');

  // Report unsaved-changes state up to the drawer. Edit mode tracks the RHF form;
  // bulk-create tracks the property/renter selection and bulk fields (held outside RHF).
  const isEdit = !!transaction;
  const revenueDirty = isEdit
    ? isDirty
    : selectedPropertyIds.length > 0 || selectedRenterIds.size > 0 || !!bulkDate || !!bulkNotes;
  useEffect(() => { onDirtyChange(revenueDirty); }, [revenueDirty, onDirtyChange]);

  useEffect(() => {
    if (periodType !== 'custom') setPeriodValue(getCurrentPeriodValue(periodType));
  }, [periodType]);

  const ownerOptions = useMemo(() => {
    const owners = Array.from(new Set(
      (properties ?? []).map((p) => p.property_owner?.trim()).filter((o): o is string => !!o)
    )).sort();
    return [
      { value: '__all__', label: t('transactions.bulkRevenue.allOwners') },
      ...owners.map((o) => ({ value: o, label: o })),
    ];
  }, [properties, t]);

  const filteredPropertyOptions = useMemo(() => {
    const all = properties ?? [];
    const filtered = ownerFilter ? all.filter((p) => p.property_owner === ownerFilter) : all;
    return filtered.map((p) => ({ value: p.id, label: `${p.address}${formatFloorApartment(p, t)}, ${p.city}` }));
  }, [properties, ownerFilter, t]);

  useEffect(() => {
    if (selectedPropertyIds.length === 0) { setAllRenters([]); return; }
    const enriched = selectedPropertyIds.flatMap((pid) => {
      const prop = (properties ?? []).find((p) => p.id === pid);
      const label = prop ? `${prop.address}${formatFloorApartment(prop, t)}, ${prop.city}` : `#${pid}`;
      return (prop?.renters ?? []).map((r) => ({ ...r, propertyId: pid, propertyLabel: label }));
    });
    setAllRenters(enriched);
    if (!bulkPayment && enriched.length > 0 && enriched[0].payment_type) {
      setBulkPayment(enriched[0].payment_type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bulkPayment is a one-time default; re-running on its change would override the user's choice
  }, [selectedPropertyIds, properties]);

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
    setBulkDateError('');
    if (selectedPropertyIds.length === 0) { setPropertyError(t('transactions.selectProperties')); return; }
    if (selectedRenterIds.size === 0) { setRenterError(t('transactions.bulkRevenue.noSelectionError')); return; }
    if (periodType === 'custom' && customMonths.size === 0) { setRenterError(t('transactions.bulkRevenue.noMonthsError')); return; }
    if (!bulkDate) { setBulkDateError(t('common.required')); return; }

    const checkedRenters = allRenters.filter((r) => selectedRenterIds.has(r.id));

    const payloads = checkedRenters.flatMap((renter) => {
      const months = periodType === 'year'
        ? getContractYearMonths(Number(periodValue), renter.lease_start ?? '')
        : periodType === 'custom'
        ? [...customMonths].sort()
        : getMonthsForPeriod(periodType as '1month', periodValue);
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
        <FormInput label={t('transactions.amount')} type="number" step="0.01" required error={errors.amount?.message} {...register('amount', { required: t('common.required') })} />
        <Controller control={control} name="monthFor" rules={{ required: t('common.required') }} render={({ field }) => (
          <WheelDatePicker mode="month" label={t('transactions.monthFor')} required value={field.value} onChange={field.onChange} error={errors.monthFor?.message} />
        )} />
        <Controller control={control} name="dateOfPayment" rules={{ required: t('common.required') }} render={({ field }) => (
          <WheelDatePicker mode="date" label={t('transactions.date')} required value={field.value} onChange={field.onChange} error={errors.dateOfPayment?.message} />
        )} />
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
      {/* Owner filter — only shown when 2+ distinct owners */}
      {ownerOptions.length > 2 && (
        <FormSelect
          label={t('transactions.bulkRevenue.ownerFilter')}
          value={ownerFilter ?? '__all__'}
          onValueChange={(v) => { setOwnerFilter(v === '__all__' ? null : v); setSelectedPropertyIds([]); setSelectedRenterIds(new Set()); setOverrideAmounts({}); setOverriddenIds(new Set()); }}
          options={ownerOptions}
          placeholder={t('transactions.bulkRevenue.allOwners')}
        />
      )}

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
        <WheelDatePicker
          mode="month"
          label={t('transactions.bulkRevenue.oneMonth')}
          value={periodValue}
          onChange={(v) => setPeriodValue(v as string)}
        />
      )}
      {periodType === 'custom' && (
        <MonthGridPicker
          selectedMonths={customMonths}
          onToggle={(m) => setCustomMonths((prev) => { const next = new Set(prev); if (next.has(m)) next.delete(m); else next.add(m); return next; })}
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
        required
        options={filteredPropertyOptions}
        selectedIds={selectedPropertyIds}
        onChange={(ids) => { setSelectedPropertyIds(ids); setSelectedRenterIds(new Set()); setOverrideAmounts({}); setOverriddenIds(new Set()); }}
        error={propertyError}
        placeholder={t('transactions.selectProperties')}
      />

      {/* Payment details */}
      <WheelDatePicker
        mode="date"
        label={t('transactions.date')}
        required
        value={bulkDate}
        onChange={(v) => { setBulkDate(v as string); setBulkDateError(''); }}
        error={bulkDateError}
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
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t('transactions.bulkRevenue.tenantsSection')}<RequiredMark /></span>
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
  supplierId: string;
  paymentMethod: string;
  notes: string;
}

interface ExpenseFormProps {
  onClose: () => void;
  transaction?: Transaction;
  onDirtyChange: (dirty: boolean) => void;
}

function ExpenseForm({ onClose, transaction, onDirtyChange }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const { data: categories } = useExpenseCategories();
  const qc = useQueryClient();
  const updateExpense = useUpdateExpenseTransaction(transaction?.id ?? 0);
  const { showToast } = useToast();
  const { user } = useAppAuth();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(transaction?.receipt_image_url ?? null);

  // ── Category multi-select state ────────────────────────────────────────────
  const initialCategoryIds = transaction?.category_ids?.length
    ? transaction.category_ids
    : transaction?.category_id
    ? [transaction.category_id]
    : [];
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(initialCategoryIds);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    const ids = transaction?.category_ids?.length
      ? transaction.category_ids
      : transaction?.category_id
      ? [transaction.category_id]
      : [];
    setSelectedCategoryIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed categories only when a different transaction loads
  }, [transaction?.id]);

  // ── Create mode state ──────────────────────────────────────────────────────
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [propertyError, setPropertyError] = useState('');

  const singlePropertyId = selectedPropertyIds.length === 1 ? selectedPropertyIds[0] : null;
  const { data: createRenters } = usePropertyRenters(singlePropertyId);

  // ── Edit mode renter data ──────────────────────────────────────────────────
  const { data: editRenters } = usePropertyRenters(transaction?.property_id ?? null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isDirty } } = useForm<ExpenseEditFields>({
    defaultValues: {
      renterId: transaction?.renter_id?.toString() ?? '__none__',
      amount: transaction?.amount?.toString() ?? '',
      dateOfPayment: transaction?.date_of_payment ?? '',
      supplierId: transaction?.supplier_id?.toString() ?? '',
      paymentMethod: transaction?.payment_method ?? '',
      notes: transaction?.notes ?? '',
    },
  });

  const watchedAmount = watch('amount');

  // Report unsaved-changes state up to the drawer. Categories are seeded from the
  // transaction in edit mode, so only count them as dirty in create mode.
  const isEdit = !!transaction;
  const baseDirty = isDirty || receiptFile !== null || selectedPropertyIds.length > 0;
  const expenseDirty = isEdit ? baseDirty : baseDirty || selectedCategoryIds.length > 0;
  useEffect(() => { onDirtyChange(expenseDirty); }, [expenseDirty, onDirtyChange]);

  // Fetch all suppliers, filter client-side by selected categories (intersection)
  const { data: allSuppliers } = useSuppliers({});
  const suppliers = selectedCategoryIds.length > 0
    ? (allSuppliers ?? []).filter((s) => s.category_ids.some((id) => selectedCategoryIds.includes(id)))
    : [];

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id, label: `${p.address}${formatFloorApartment(p, t)}, ${p.city}` }));
  const supplierOptions = suppliers.map((s) => ({ value: s.id.toString(), label: s.name }));
  const paymentOptions = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  const createRenterOptions = (createRenters ?? []).map((r) => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }));
  const editRenterOptions = (editRenters ?? []).map((r) => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }));

  const handleCategoryChange = (ids: number[]) => {
    setSelectedCategoryIds(ids);
    setCategoryError('');
    setValue('supplierId', '');
  };

  const onEditSubmit = handleSubmit(async (data) => {
    if (selectedCategoryIds.length === 0) { setCategoryError(t('transactions.selectCategory')); return; }
    try {
      let receiptUrl = transaction?.receipt_image_url ?? undefined;
      if (receiptFile && user) {
        receiptUrl = await uploadToFirebase(receiptFile, 'transactions', user.uid);
      }
      await updateExpense.mutateAsync({
        renter_id: data.renterId && data.renterId !== '__none__' ? Number(data.renterId) : null,
        amount: Number(data.amount),
        date_of_payment: data.dateOfPayment,
        payment_method: data.paymentMethod as never,
        category_ids: selectedCategoryIds,
        supplier_id: data.supplierId ? Number(data.supplierId) : null,
        notes: data.notes || null,
        receipt_image_url: receiptUrl ?? null,
      });
      showToast(t('transactions.updateSuccess'), 'success');
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  // ── Create mode submit ─────────────────────────────────────────────────────
  const handleBulkCreate = handleSubmit(async (data) => {
    setPropertyError('');
    if (selectedPropertyIds.length === 0) { setPropertyError(t('transactions.selectProperties')); return; }
    if (selectedCategoryIds.length === 0) { setCategoryError(t('transactions.selectCategory')); return; }

    const perAmount = Number(data.amount) / selectedPropertyIds.length;
    const renterId = selectedPropertyIds.length === 1 && data.renterId && data.renterId !== '__none__' ? Number(data.renterId) : null;

    const payloads = selectedPropertyIds.map((pid) => ({
      property_id: pid,
      renter_id: renterId,
      amount: perAmount,
      date_of_payment: data.dateOfPayment,
      payment_method: data.paymentMethod as never,
      category_ids: selectedCategoryIds,
      supplier_id: data.supplierId ? Number(data.supplierId) : null,
      notes: data.notes || undefined,
      receipt_image_url: receiptFile ? undefined : null,
    }));

    try {
      const results = await Promise.allSettled(payloads.map((p) => createExpenseTransaction(p)));
      if (receiptFile && user) {
        const receiptUrl = await uploadToFirebase(receiptFile, 'transactions', user.uid);
        const created = results.filter((r): r is PromiseFulfilledResult<Transaction> => r.status === 'fulfilled');
        await Promise.allSettled(created.map((r) => updateExpenseTransaction(r.value.id, { receipt_image_url: receiptUrl })));
      }
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
        <FormInput label={t('transactions.amount')} type="number" step="0.01" required error={errors.amount?.message} {...register('amount', { required: t('common.required') })} />
        <Controller control={control} name="dateOfPayment" rules={{ required: t('common.required') }} render={({ field }) => (
          <WheelDatePicker mode="date" label={t('transactions.date')} required value={field.value} onChange={field.onChange} error={errors.dateOfPayment?.message} />
        )} />
        <CategoryMultiSelect
          label={t('transactions.category')}
          required
          categories={categories ?? []}
          selectedIds={selectedCategoryIds}
          onChange={handleCategoryChange}
          error={categoryError}
        />
        {selectedCategoryIds.length > 0 && supplierOptions.length > 0 && (
          <Controller control={control} name="supplierId" render={({ field }) => (
            <FormSelect label={t('transactions.supplier')} value={field.value} onValueChange={field.onChange} options={supplierOptions} placeholder={t('transactions.selectSupplier')} />
          )} />
        )}
        <Controller control={control} name="paymentMethod" rules={{ required: t('common.required') }} render={({ field }) => (
          <FormSelect label={t('transactions.paymentMethod')} required value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} error={errors.paymentMethod?.message} />
        )} />
        <FormInput label={t('transactions.notes')} {...register('notes')} />
        <FormFileInput
          label={t('transactions.receiptImage')}
          accept="image/*"
          value={receiptFile}
          onChange={(f) => { setReceiptFile(f); setReceiptPreview(f ? URL.createObjectURL(f) : transaction?.receipt_image_url ?? null); }}
          preview={receiptPreview}
        />
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
        required
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
          required
          error={errors.amount?.message}
          {...register('amount', { required: t('common.required') })}
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

      <Controller control={control} name="dateOfPayment" rules={{ required: t('common.required') }} render={({ field }) => (
        <WheelDatePicker mode="date" label={t('transactions.date')} required value={field.value} onChange={field.onChange} error={errors.dateOfPayment?.message} />
      )} />
      <CategoryMultiSelect
        label={t('transactions.category')}
        required
        categories={categories ?? []}
        selectedIds={selectedCategoryIds}
        onChange={handleCategoryChange}
        error={categoryError}
      />
      {selectedCategoryIds.length > 0 && supplierOptions.length > 0 && (
        <Controller control={control} name="supplierId" render={({ field }) => (
          <FormSelect label={t('transactions.supplier')} value={field.value} onValueChange={field.onChange} options={supplierOptions} placeholder={t('transactions.selectSupplier')} />
        )} />
      )}
      <Controller control={control} name="paymentMethod" rules={{ required: t('common.required') }} render={({ field }) => (
        <FormSelect label={t('transactions.paymentMethod')} required value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} error={errors.paymentMethod?.message} />
      )} />
      <FormInput label={t('transactions.notes')} {...register('notes')} />
      <FormFileInput
        label={t('transactions.receiptImage')}
        accept="image/*"
        value={receiptFile}
        onChange={(f) => { setReceiptFile(f); setReceiptPreview(f ? URL.createObjectURL(f) : null); }}
        preview={receiptPreview}
      />
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
  // The active child form reports its dirty state up so the guard can live at the
  // Drawer boundary regardless of revenue/expense mode.
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  useEffect(() => {
    if (!open) setTxType(editType ?? initialType ?? null);
    else if (editType ?? initialType) setTxType(editType ?? initialType ?? null);
  }, [open, initialType, editType]);

  // Reset the dirty signal whenever the drawer opens/closes or the type changes —
  // the freshly mounted child re-reports its own state.
  useEffect(() => { setDirty(false); setShowDiscard(false); }, [open, txType]);

  const attemptClose = () => { if (dirty) setShowDiscard(true); else onClose(); };

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
        onClick={() => { if (isEditing || initialType) attemptClose(); else setTxType(null); }}
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
      onClick={attemptClose}
      className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
      style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
    >
      {t('common.cancel')}
    </button>
  );

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      onRequestClose={attemptClose}
      title={isEditing ? t('transactions.editTransaction') : t('transactions.addNew')}
      width={640}
      footer={footer}
    >
      {!txType ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <RevenueForm onClose={onClose} transaction={transaction} onDirtyChange={setDirty} />
      ) : (
        <ExpenseForm onClose={onClose} transaction={transaction} onDirtyChange={setDirty} />
      )}
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
