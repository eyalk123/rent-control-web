import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';
import {
  useCreateRevenueTransaction,
  useCreateExpenseTransaction,
  useExpenseCategories,
} from '../queries';
import { useProperties } from '@/features/properties/queries';
import { useSuppliers } from '@/features/suppliers/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';
import { PAYMENT_METHOD_VALUES } from '@/shared/constants/paymentMethods';

type TxType = 'revenue' | 'expense';

interface RevenueFormFields {
  propertyId: string;
  amount: string;
  monthFor: string;
  dateOfPayment: string;
  paymentMethod: string;
  notes: string;
}

interface ExpenseFormFields {
  propertyId: string;
  amount: string;
  dateOfPayment: string;
  categoryId: string;
  supplierId: string;
  paymentMethod: string;
  notes: string;
}

function RevenueForm() {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const createRevenue = useCreateRevenueTransaction();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RevenueFormFields>({
    defaultValues: { propertyId: '', amount: '', monthFor: '', dateOfPayment: '', paymentMethod: '', notes: '' },
  });

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id.toString(), label: `${p.address}, ${p.city}` }));
  const paymentOptions = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  const onSubmit = handleSubmit(async (data) => {
    if (!data.propertyId) return;
    try {
      await createRevenue.mutateAsync({
        property_id: Number(data.propertyId),
        renter_id: null,
        amount: Number(data.amount),
        date_of_payment: data.dateOfPayment,
        month_for: data.monthFor,
        payment_method: (data.paymentMethod || undefined) as never,
        notes: data.notes || undefined,
      });
      showToast(t('transactions.createSuccess'), 'success');
      navigate('/transactions');
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Controller control={control} name="propertyId" render={({ field }) => (
        <FormSelect label={t('transactions.property')} value={field.value} onValueChange={field.onChange} options={propertyOptions} placeholder={t('transactions.selectProperty')} error={errors.propertyId?.message} />
      )} />
      <FormInput label={t('transactions.amount')} type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: true })} />
      <FormInput label={t('transactions.monthFor')} type="month" error={errors.monthFor?.message} {...register('monthFor', { required: true })} />
      <FormDateInput label={t('transactions.date')} error={errors.dateOfPayment?.message} {...register('dateOfPayment', { required: true })} />
      <Controller control={control} name="paymentMethod" render={({ field }) => (
        <FormSelect label={t('transactions.paymentMethod')} value={field.value} onValueChange={field.onChange} options={paymentOptions} placeholder={t('transactions.selectPaymentMethod')} />
      )} />
      <FormInput label={t('transactions.notes')} {...register('notes')} />
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {isSubmitting ? '...' : t('common.save')}
      </button>
    </form>
  );
}

function ExpenseForm() {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const { data: categories } = useExpenseCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { data: suppliers } = useSuppliers({ categoryId: selectedCategoryId ?? undefined });
  const createExpense = useCreateExpenseTransaction();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ExpenseFormFields>({
    defaultValues: { propertyId: '', amount: '', dateOfPayment: '', categoryId: '', supplierId: '', paymentMethod: '', notes: '' },
  });

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id.toString(), label: `${p.address}, ${p.city}` }));
  const categoryOptions = (categories ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id.toString(), label: c.name ?? c.key ?? String(c.id) }));
  const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id.toString(), label: s.name }));
  const paymentOptions = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  const onSubmit = handleSubmit(async (data) => {
    if (!data.propertyId || !data.categoryId) return;
    try {
      await createExpense.mutateAsync({
        property_id: Number(data.propertyId),
        renter_id: null,
        amount: Number(data.amount),
        date_of_payment: data.dateOfPayment,
        payment_method: data.paymentMethod as never,
        category_id: Number(data.categoryId),
        supplier_id: data.supplierId ? Number(data.supplierId) : null,
        notes: data.notes || undefined,
      });
      showToast(t('transactions.createSuccess'), 'success');
      navigate('/transactions');
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Controller control={control} name="propertyId" render={({ field }) => (
        <FormSelect label={t('transactions.property')} value={field.value} onValueChange={field.onChange} options={propertyOptions} placeholder={t('transactions.selectProperty')} />
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
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {isSubmitting ? '...' : t('common.save')}
      </button>
    </form>
  );
}

export function AddTransactionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [txType, setTxType] = useState<TxType | null>(null);

  return (
    <PageContainer>
      <button onClick={() => txType ? setTxType(null) : navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={16} />{txType ? t('common.back') : t('common.cancel')}
      </button>
      <h1 className="mb-5 text-xl font-bold text-[var(--color-text-primary)]">{t('transactions.addNew')}</h1>

      {!txType ? (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <button
            onClick={() => setTxType('revenue')}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--color-rev-fg)]/30 bg-[var(--color-rev-bg)] p-6 hover:border-[var(--color-rev-fg)]/60 transition-colors"
          >
            <TrendingUp size={28} className="text-[var(--color-rev-fg)]" />
            <span className="text-sm font-semibold text-[var(--color-rev-fg)]">{t('transactions.revenue')}</span>
          </button>
          <button
            onClick={() => setTxType('expense')}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--color-exp-fg)]/30 bg-[var(--color-exp-bg)] p-6 hover:border-[var(--color-exp-fg)]/60 transition-colors"
          >
            <TrendingDown size={28} className="text-[var(--color-exp-fg)]" />
            <span className="text-sm font-semibold text-[var(--color-exp-fg)]">{t('transactions.expense')}</span>
          </button>
        </div>
      ) : (
        <div className="max-w-2xl rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            {txType === 'revenue' ? t('transactions.revenue') : t('transactions.expense')}
          </p>
          {txType === 'revenue' ? <RevenueForm /> : <ExpenseForm />}
        </div>
      )}
    </PageContainer>
  );
}
