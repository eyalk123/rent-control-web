import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Plus } from 'lucide-react';
import { supplierFormSchema, type SupplierFormValues } from '../validation/supplierValidation';
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '../queries';
import { useExpenseCategories } from '@/features/transactions/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { BankAccountInput, isValidBankAccount, type BankAccountValue } from '@/shared/components/form/BankAccountInput';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { AddCategoryModal } from '@/features/transactions/components/AddCategoryModal';

interface Props {
  open: boolean;
  onClose: () => void;
  supplierId?: number;
}

export function SupplierFormDrawer({ open, onClose, supplierId }: Props) {
  const { t } = useTranslation();
  const isEditing = !!supplierId;

  const { data: existing } = useSupplier(supplierId ?? 0);
  const { data: categories = [] } = useExpenseCategories();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(supplierId ?? 0);
  const { showToast } = useToast();
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema) as never,
    defaultValues: { name: '', phone: '', email: '', notes: '', categoryIds: [], bankAccount: { bank: '', branch: '', account: '' } },
  });

  const selectedCategoryIds = watch('categoryIds') ?? [];

  useEffect(() => {
    if (!open && !supplierId) {
      reset({ name: '', phone: '', email: '', notes: '', categoryIds: [], bankAccount: { bank: '', branch: '', account: '' } });
    }
  }, [open, supplierId, reset]);

  useEffect(() => {
    if (existing && open) {
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
  }, [existing, open, reset]);

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
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[SupplierFormDrawer] save failed:', err);
      showToast(t('error.saveFailed'), 'error');
    }
  });

  const handleDeactivate = async () => {
    if (!supplierId) return;
    if (!confirm(t('suppliers.deactivateConfirm'))) return;
    try {
      await updateMutation.mutateAsync({ is_active: false });
      showToast(t('suppliers.deactivateSuccess'), 'success');
      onClose();
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

  const footer = (
    <div className="flex items-center gap-3">
      {isEditing && existing?.is_active !== false && (
        <button
          type="button"
          onClick={handleDeactivate}
          className="flex items-center gap-1.5 h-10 px-3 rounded-[9px] text-[13px] font-medium"
          style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'transparent' }}
        >
          <Trash2 size={14} />{t('suppliers.deactivate')}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium ms-auto"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="submit"
        form="supplier-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {isSubmitting ? '...' : t('common.save')}
      </button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t('suppliers.editTitle') : t('suppliers.addTitle')}
      width={620}
      footer={footer}
    >
      <form id="supplier-form" onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <FormInput label={t('suppliers.name', 'Name')} error={errors.name?.message} {...register('name')} />
          <FormInput label={t('suppliers.phone', 'Phone')} type="tel" {...register('phone')} />
          <FormInput label={t('suppliers.email', 'Email')} type="email" {...register('email')} />
          <FormInput label={t('suppliers.notes', 'Notes')} {...register('notes')} />

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('transactions.category')}</p>
            {errors.categoryIds && <p className="text-xs mb-2" style={{ color: 'var(--color-error)' }}>{t(errors.categoryIds.message!, { defaultValue: errors.categoryIds.message })}</p>}
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((c) => {
                const selected = selectedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
                    style={{
                      background: selected ? 'var(--color-primary)' : 'var(--color-input-bg)',
                      color: selected ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {c.name ?? (c.key ? translateCategory(c.key, t) : String(c.id))}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAddCategoryOpen(true)}
                className="rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1 transition-colors"
                style={{
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
                }}
              >
                <Plus size={13} />
                {t('categories.add')}
              </button>
            </div>
          </div>
          <AddCategoryModal
            opened={addCategoryOpen}
            onClose={() => setAddCategoryOpen(false)}
            onCreated={(cat) => {
              const current = selectedCategoryIds;
              setValue('categoryIds', [...current, cat.id], { shouldValidate: true });
            }}
          />
        </div>

        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('suppliers.bankAccount')}</p>
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
      </form>
    </Drawer>
  );
}
