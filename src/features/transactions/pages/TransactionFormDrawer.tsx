import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
import { Drawer } from '@/shared/components/ui/Drawer';
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

interface RevenueFormProps {
  onClose: () => void;
  initialPropertyId?: number;
}

function RevenueForm({ onClose, initialPropertyId }: RevenueFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const createRevenue = useCreateRevenueTransaction();
  const { showToast } = useToast();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RevenueFormFields>({
    defaultValues: {
      propertyId: initialPropertyId?.toString() ?? '',
      amount: '',
      monthFor: '',
      dateOfPayment: '',
      paymentMethod: '',
      notes: '',
    },
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
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  return (
    <form id="transaction-form" onSubmit={onSubmit} className="space-y-4">
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
    </form>
  );
}

interface ExpenseFormProps {
  onClose: () => void;
  initialPropertyId?: number;
}

function ExpenseForm({ onClose, initialPropertyId }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();
  const { data: categories } = useExpenseCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { data: suppliers } = useSuppliers({ categoryId: selectedCategoryId ?? undefined });
  const createExpense = useCreateExpenseTransaction();
  const { showToast } = useToast();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ExpenseFormFields>({
    defaultValues: {
      propertyId: initialPropertyId?.toString() ?? '',
      amount: '',
      dateOfPayment: '',
      categoryId: '',
      supplierId: '',
      paymentMethod: '',
      notes: '',
    },
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
      onClose();
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  return (
    <form id="transaction-form" onSubmit={onSubmit} className="space-y-4">
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
    </form>
  );
}

// ─── main drawer ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  initialType?: TxType;
  initialPropertyId?: number;
}

export function TransactionFormDrawer({ open, onClose, initialType, initialPropertyId }: Props) {
  const { t } = useTranslation();
  const [txType, setTxType] = useState<TxType | null>(initialType ?? null);

  useEffect(() => {
    if (!open) setTxType(initialType ?? null);
    else if (initialType) setTxType(initialType);
  }, [open, initialType]);

  const saveButton = (
    <button
      type="submit"
      form="transaction-form"
      className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90"
      style={{ background: 'var(--color-primary)' }}
    >
      {t('common.save')}
    </button>
  );

  const footer = txType ? (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => { if (initialType) onClose(); else setTxType(null); }}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {initialType ? t('common.cancel') : t('common.back')}
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
      title={t('transactions.addNew')}
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
        <RevenueForm onClose={onClose} initialPropertyId={initialPropertyId} />
      ) : (
        <ExpenseForm onClose={onClose} initialPropertyId={initialPropertyId} />
      )}
    </Drawer>
  );
}
