import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { supplierFormSchema, type SupplierFormValues } from '../validation/supplierValidation';
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '../queries';
import { useExpenseCategories } from '@/features/transactions/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { BankAccountInput, isValidBankAccount, type BankAccountValue } from '@/shared/components/form/BankAccountInput';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';

export function AddEditSupplierPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const supplierId = id ? Number(id) : undefined;

  const { data: existing } = useSupplier(supplierId ?? 0);
  const { data: categories = [] } = useExpenseCategories();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(supplierId ?? 0);
  const { showToast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema) as never,
    defaultValues: { name: '', phone: '', email: '', notes: '', categoryIds: [], bankAccount: { bank: '', branch: '', account: '' } },
  });

  const selectedCategoryIds = watch('categoryIds') ?? [];

  useEffect(() => {
    if (existing) {
      const parsedBankAccount = (() => {
        if (!existing.bank_account) return { bank: '', branch: '', account: '' };
        const parts = existing.bank_account.split('/');
        return { bank: parts[0] ?? '', branch: parts[1] ?? '', account: parts[2] ?? '' };
      })();
      reset({
        name: existing.name,
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        notes: existing.notes ?? '',
        categoryIds: existing.category_ids ?? [],
        bankAccount: parsedBankAccount as BankAccountValue,
      });
    }
  }, [existing, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
        bank_account: isValidBankAccount(data.bankAccount as BankAccountValue)
          ? `${data.bankAccount.bank}/${data.bankAccount.branch}/${data.bankAccount.account}`
          : null,
        category_ids: data.categoryIds,
      };

      if (isEditing && supplierId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload as never);
      }
      showToast(t(isEditing ? 'suppliers.updateSuccess' : 'suppliers.createSuccess'), 'success');
      navigate('/suppliers');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  });

  const handleDeactivate = async () => {
    if (!supplierId) return;
    if (!confirm(t('suppliers.deactivateConfirm'))) return;
    try {
      await updateMutation.mutateAsync({ is_active: false });
      showToast(t('suppliers.deactivateSuccess'), 'success');
      navigate('/suppliers');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const toggleCategory = (catId: number) => {
    const current = selectedCategoryIds;
    const updated = current.includes(catId) ? current.filter((c) => c !== catId) : [...current, catId];
    setValue('categoryIds', updated, { shouldValidate: true });
  };

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
          <ChevronLeft size={16} />{t('common.cancel')}
        </button>
        {isEditing && existing?.is_active !== false && (
          <button onClick={handleDeactivate} className="flex items-center gap-1.5 text-sm text-[var(--color-error)] hover:opacity-80">
            <Trash2 size={14} />{t('suppliers.deactivate')}
          </button>
        )}
      </div>
      <h1 className="mb-5 text-xl font-bold text-[var(--color-text-primary)]">
        {isEditing ? t('suppliers.editTitle') : t('suppliers.addTitle')}
      </h1>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 space-y-4">
          <FormInput label={t('suppliers.name', 'Name')} error={errors.name?.message} {...register('name')} />
          <FormInput label={t('suppliers.phone', 'Phone')} type="tel" {...register('phone')} />
          <FormInput label={t('suppliers.email', 'Email')} type="email" {...register('email')} />
          <FormInput label={t('suppliers.notes', 'Notes')} {...register('notes')} />

          {/* Categories */}
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('transactions.category')}</p>
            {errors.categoryIds && <p className="text-xs text-[var(--color-error)] mb-2">{errors.categoryIds.message}</p>}
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((c) => {
                const selected = selectedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
                  >
                    {c.name ?? c.key ?? String(c.id)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 space-y-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('suppliers.bankAccount')}
          </p>
          <Controller
            control={control}
            name="bankAccount"
            render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
              <BankAccountInput
                value={(value as BankAccountValue) ?? { bank: '', branch: '', account: '' }}
                onChange={onChange}
                disabled={isSubmitting}
                error={fieldError?.message}
              />
            )}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {isSubmitting ? '...' : t('common.save')}
        </button>
      </form>
    </PageContainer>
  );
}
