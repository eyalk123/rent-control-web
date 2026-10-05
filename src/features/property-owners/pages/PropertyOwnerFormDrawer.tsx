import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  propertyOwnerFormSchema,
  type PropertyOwnerFormValues,
} from '../validation/propertyOwnerValidation';
import {
  isPropertyOwnerConflict,
  useCreatePropertyOwner,
  usePropertyOwner,
  useUpdatePropertyOwner,
} from '../queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { BankAccountInput, isValidBankAccount, type BankAccountValue } from '@/shared/components/form/BankAccountInput';
import { capabilities } from '@/shared/utils/capabilities';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import type { PropertyOwner } from '@/shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  ownerId?: number;
  /** Called with the new owner after a create — the property form uses it to select them. */
  onCreated?: (owner: PropertyOwner) => void;
  /** A name to start a new owner from — what a scanned lease called them. */
  initialName?: string;
}

const EMPTY: PropertyOwnerFormValues = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  bankAccount: { bank: '', branch: '', account: '' },
  paymentDetails: '',
};

export function PropertyOwnerFormDrawer({ open, onClose, ownerId, onCreated, initialName }: Props) {
  const { t } = useTranslation();
  const isEditing = !!ownerId;

  const { data: existing } = usePropertyOwner(ownerId ?? 0);
  const createMutation = useCreatePropertyOwner();
  const updateMutation = useUpdatePropertyOwner(ownerId ?? 0);
  const { showToast } = useToast();
  const [showDiscard, setShowDiscard] = useState(false);

  const { register, handleSubmit, reset, setError, control, formState: { errors, isSubmitting, isDirty } } = useForm<PropertyOwnerFormValues>({
    resolver: zodResolver(propertyOwnerFormSchema) as never,
    defaultValues: EMPTY,
  });

  const attemptClose = () => { if (isDirty) setShowDiscard(true); else onClose(); };

  useEffect(() => {
    if (!open) setShowDiscard(false);
  }, [open]);

  useEffect(() => {
    if (!open && !ownerId) reset(EMPTY);
    // Prefilled, not typed: a default rather than a change, so closing asks nothing.
    if (open && !ownerId && initialName) reset({ ...EMPTY, name: initialName });
  }, [open, ownerId, initialName, reset]);

  useEffect(() => {
    if (existing && open) {
      // Stored as one string, shown two ways — the same arrangement as the supplier form.
      const structured = capabilities().structuredBankDetails;
      const parts = structured && existing.bank_account ? existing.bank_account.split('/') : [];
      reset({
        name: existing.name,
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        notes: existing.notes ?? '',
        bankAccount: { bank: parts[0] ?? '', branch: parts[1] ?? '', account: parts[2] ?? '' },
        paymentDetails: structured ? '' : (existing.bank_account ?? ''),
      });
    }
  }, [existing, open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      bank_account: capabilities().structuredBankDetails
        ? isValidBankAccount(data.bankAccount as BankAccountValue)
          ? `${data.bankAccount.bank}/${data.bankAccount.branch}/${data.bankAccount.account}`
          : null
        : data.paymentDetails.trim() || null,
    };
    try {
      if (isEditing && ownerId) {
        await updateMutation.mutateAsync(payload);
      } else {
        const created = await createMutation.mutateAsync(payload);
        onCreated?.(created);
      }
      showToast(t(isEditing ? 'propertyOwners.updateSuccess' : 'propertyOwners.createSuccess'), 'success');
      onClose();
    } catch (err) {
      if (isPropertyOwnerConflict(err)) {
        setError('name', { message: 'propertyOwners.nameTaken' });
        return;
      }
      if (import.meta.env.DEV) console.error('[PropertyOwnerFormDrawer] save failed:', err);
      showToast(t('error.saveFailed'), 'error');
    }
  });

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={attemptClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium ms-auto"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="submit"
        form="property-owner-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {isSubmitting ? '...' : t('common.save')}
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        onRequestClose={attemptClose}
        title={isEditing ? t('propertyOwners.editTitle') : t('propertyOwners.addTitle')}
        width={620}
        footer={footer}
        animateScrim={false}
      >
        <form id="property-owner-form" onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <FormInput
              label={t('propertyOwners.name')}
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <FormInput label={t('suppliers.phone')} type="tel" {...register('phone')} />
            <FormInput label={t('suppliers.email')} type="email" {...register('email')} />
            <FormInput label={t('suppliers.notes')} {...register('notes')} />
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {capabilities().structuredBankDetails ? t('suppliers.bankAccount') : t('suppliers.paymentDetails')}
            </p>
            {capabilities().structuredBankDetails ? (
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
            ) : (
              <FormInput
                label={t('suppliers.paymentDetails')}
                placeholder={t('suppliers.paymentDetailsPlaceholder')}
                disabled={isSubmitting}
                error={errors.paymentDetails?.message}
                {...register('paymentDetails')}
              />
            )}
          </div>
        </form>
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
