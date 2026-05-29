import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { renterFormSchema } from '../validation/renterValidation';
import { getLeaseYearLabel } from '@/shared/utils/leaseYear';
import { useCreateRenter, useUpdateRenter, useRenter } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { WheelDatePicker } from '@/shared/components/form/WheelDatePicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import type { z } from 'zod';

type FormData = z.infer<typeof renterFormSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  renterId?: number;
  initialPropertyId?: number;
}

export function RenterFormDrawer({ open, onClose, renterId, initialPropertyId }: Props) {
  const { t } = useTranslation();
  const isEditing = !!renterId;

  const { data: existing } = useRenter(renterId ?? 0);
  const { data: properties } = useProperties();
  const createMutation = useCreateRenter();
  const updateMutation = useUpdateRenter(renterId ?? 0);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(renterFormSchema) as never,
    defaultValues: { leaseStart: '', leaseYears: [{ amount: '', type: 'contract' }], extraContacts: [] },
  });

  const leaseStart = watch('leaseStart');
  const { fields: leaseYearFields, append: addYear, remove: removeYear } = useFieldArray({ control, name: 'leaseYears' });
  const { fields: contactFields, append: addContact, remove: removeContact } = useFieldArray({ control, name: 'extraContacts' });

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  useEffect(() => {
    if (existing && open) {
      reset({
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone,
        email: existing.email ?? '',
        propertyId: existing.property_id?.toString() ?? '',
        leaseStart: existing.lease_start ?? '',
        leaseYears: existing.lease_years.map((ly) => ({ amount: ly.amount.toString(), type: ly.type })),
        paymentDayOfMonth: existing.payment_day_of_month?.toString() ?? '',
        paymentType: existing.payment_type ?? undefined,
        extraContacts: existing.extra_contacts ?? [],
        insuranceType: existing.insurance_type ?? '',
        insuranceAmount: existing.insurance_amount?.toString() ?? '',
      });
    } else if (!renterId && open) {
      reset({
        leaseStart: '',
        leaseYears: [{ amount: '', type: 'contract' }],
        extraContacts: [],
        propertyId: initialPropertyId?.toString() ?? '',
      });
    }
  }, [existing, open, renterId, initialPropertyId, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        property_id: data.propertyId ? Number(data.propertyId) : null,
        lease_start: data.leaseStart || undefined,
        lease_years: (data.leaseYears ?? []).map((ly: { amount: string; type?: 'option' | 'contract' }) => ({ amount: Number(ly.amount) || 0, type: ly.type ?? 'contract' })),
        payment_day_of_month: data.paymentDayOfMonth ? Number(data.paymentDayOfMonth) : undefined,
        payment_type: data.paymentType || undefined,
        extra_contacts: data.extraContacts ?? [],
        insurance_type: data.insuranceType || undefined,
        insurance_amount: data.insuranceAmount ? Number(data.insuranceAmount) : undefined,
      };

      if (isEditing && renterId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload as never);
      }
      showToast(t(isEditing ? 'renter.updateSuccess' : 'renter.createSuccess'), 'success');
      onClose();
    } catch (err) { console.error('[RenterFormDrawer] save failed:', err); showToast(t('error.saveFailed'), 'error'); }
  });

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id.toString(), label: `${p.address}, ${p.city}` }));
  const paymentTypeOptions = ['cash', 'bank_transfer', 'bit', 'check'].map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={step === 2 ? () => setStep(1) : onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {step === 2 ? t('common.back') : t('common.cancel')}
      </button>
      {step === 1 ? (
        <button
          key="next"
          type="button"
          onClick={() => setStep(2)}
          className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >
          {t('common.next')}
        </button>
      ) : (
        <button
          key="save"
          type="submit"
          form="renter-form"
          disabled={isSubmitting}
          className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {isSubmitting ? '...' : t('common.save')}
        </button>
      )}
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t('renter.editTitle') : t('renter.addTitle')}
      width={640}
      footer={footer}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
        ))}
        <span className="ms-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{step}/2</span>
      </div>

      <form id="renter-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('renter.firstName')} error={errors.firstName?.message} {...register('firstName')} />
              <FormInput label={t('renter.lastName')} error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <FormInput label={t('renter.phone')} type="tel" error={errors.phone?.message} {...register('phone')} />
            <FormInput label={t('renter.email')} type="email" error={errors.email?.message} {...register('email')} />
            <Controller control={control} name="propertyId" render={({ field }) => (
              <FormSelect label={t('renter.property')} value={field.value} onValueChange={field.onChange} options={propertyOptions} placeholder={t('renter.selectProperty')} />
            )} />
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('renter.extraContacts')}</p>
              <div className="space-y-2">
                {contactFields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <FormInput placeholder={t('renter.contactName')} {...register(`extraContacts.${i}.name`)} className="flex-1" />
                    <FormInput placeholder={t('renter.contactPhone')} {...register(`extraContacts.${i}.phone`)} className="flex-1" />
                    <button type="button" onClick={() => removeContact(i)} style={{ color: 'var(--color-error)' }}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addContact({ name: '', phone: '' })} className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
                  <Plus size={14} />{t('renter.addContact')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Controller control={control} name="leaseStart" render={({ field }) => (
              <WheelDatePicker mode="date" label={t('renter.leaseStart')} value={field.value} onChange={(v) => field.onChange(v)} error={errors.leaseStart?.message} />
            )} />
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('renter.leaseYears')}</p>
              <div className="space-y-2">
                {leaseYearFields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-12 text-center shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{getLeaseYearLabel(leaseStart, i)}</span>
                    <FormInput type="number" placeholder={t('renter.amount')} {...register(`leaseYears.${i}.amount`)} className="flex-1" />
                    <Controller control={control} name={`leaseYears.${i}.type`} render={({ field }) => (
                      <FormSelect value={field.value} onValueChange={field.onChange} options={[{ value: 'contract', label: t('renter.contract') }, { value: 'option', label: t('renter.option') }]} />
                    )} />
                    {leaseYearFields.length > 1 && (
                      <button type="button" onClick={() => removeYear(i)} style={{ color: 'var(--color-error)' }}><X size={16} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addYear({ amount: '', type: 'contract' })} className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
                  <Plus size={14} />{t('renter.addYear')}
                </button>
              </div>
            </div>
            <Controller control={control} name="paymentDayOfMonth" render={({ field }) => (
              <WheelDatePicker mode="day" label={t('renter.paymentDay')} value={field.value ? Number(field.value) : undefined} onChange={(v) => field.onChange(String(v))} error={errors.paymentDayOfMonth?.message} />
            )} />
            <Controller control={control} name="paymentType" render={({ field }) => (
              <FormSelect label={t('renter.paymentType')} value={field.value} onValueChange={field.onChange} options={paymentTypeOptions} placeholder={t('renter.selectPaymentType')} />
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('renter.insuranceType')} {...register('insuranceType')} />
              <FormInput label={t('renter.insuranceAmount')} type="number" {...register('insuranceAmount')} />
            </div>
          </>
        )}
      </form>
    </Drawer>
  );
}
