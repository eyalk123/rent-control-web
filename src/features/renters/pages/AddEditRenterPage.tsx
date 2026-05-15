import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { renterFormSchema } from '../validation/renterValidation';
import { useCreateRenter, useUpdateRenter, useRenter } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';
import type { z } from 'zod';

type FormData = z.infer<typeof renterFormSchema>;

export function AddEditRenterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const renterId = id ? Number(id) : undefined;

  const { data: existing } = useRenter(renterId ?? 0);
  const { data: properties } = useProperties();
  const createMutation = useCreateRenter();
  const updateMutation = useUpdateRenter(renterId ?? 0);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(renterFormSchema) as never,
    defaultValues: { leaseYears: [{ amount: '', type: 'contract' }], extraContacts: [] },
  });

  const { fields: leaseYearFields, append: addYear, remove: removeYear } = useFieldArray({ control, name: 'leaseYears' });
  const { fields: contactFields, append: addContact, remove: removeContact } = useFieldArray({ control, name: 'extraContacts' });

  useEffect(() => {
    if (existing) {
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
    }
  }, [existing, reset]);

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
      navigate('/renters');
    } catch { showToast(t('error.saveFailed'), 'error'); }
  });

  const propertyOptions = (properties ?? []).map((p) => ({ value: p.id.toString(), label: `${p.address}, ${p.city}` }));
  const paymentTypeOptions = ['cash', 'bank_transfer', 'bit', 'check'].map((v) => ({ value: v, label: t(`transactions.paymentMethod_${v}` as never, v) }));

  return (
    <PageContainer>
      <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={16} />{step === 2 ? t('common.back') : t('common.cancel')}
      </button>
      <h1 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">{isEditing ? t('renter.editTitle') : t('renter.addTitle')}</h1>
      <div className="mb-6 flex items-center gap-2">
        {[1, 2].map((s) => <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />)}
        <span className="ms-1 text-xs text-[var(--color-text-secondary)]">{step}/2</span>
      </div>

      <form onSubmit={onSubmit}>
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 flex flex-col gap-4 max-w-2xl">
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
              {/* Extra contacts */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('renter.extraContacts')}</p>
                <div className="space-y-2">
                  {contactFields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <FormInput placeholder={t('renter.contactName')} {...register(`extraContacts.${i}.name`)} className="flex-1" />
                      <FormInput placeholder={t('renter.contactPhone')} {...register(`extraContacts.${i}.phone`)} className="flex-1" />
                      <button type="button" onClick={() => removeContact(i)} className="text-[var(--color-error)] hover:opacity-80"><X size={16} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addContact({ name: '', phone: '' })} className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:opacity-80"><Plus size={14} />{t('renter.addContact')}</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <FormDateInput label={t('renter.leaseStart')} error={errors.leaseStart?.message} {...register('leaseStart')} />
              {/* Lease years */}
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('renter.leaseYears')}</p>
                <div className="space-y-2">
                  {leaseYearFields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <FormInput type="number" placeholder={t('renter.amount')} {...register(`leaseYears.${i}.amount`)} className="flex-1" />
                      <Controller control={control} name={`leaseYears.${i}.type`} render={({ field }) => (
                        <FormSelect value={field.value} onValueChange={field.onChange} options={[{ value: 'contract', label: t('renter.contract') }, { value: 'option', label: t('renter.option') }]} />
                      )} />
                      {leaseYearFields.length > 1 && <button type="button" onClick={() => removeYear(i)} className="text-[var(--color-error)]"><X size={16} /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => addYear({ amount: '', type: 'contract' })} className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:opacity-80"><Plus size={14} />{t('renter.addYear')}</button>
                </div>
              </div>
              <FormInput label={t('renter.paymentDay')} type="number" min="1" max="31" error={errors.paymentDayOfMonth?.message} {...register('paymentDayOfMonth')} />
              <Controller control={control} name="paymentType" render={({ field }) => (
                <FormSelect label={t('renter.paymentType')} value={field.value} onValueChange={field.onChange} options={paymentTypeOptions} placeholder={t('renter.selectPaymentType')} />
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label={t('renter.insuranceType')} {...register('insuranceType')} />
                <FormInput label={t('renter.insuranceAmount')} type="number" {...register('insuranceAmount')} />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex gap-3 max-w-2xl">
          {step === 1 ? (
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90">{t('common.next')}</button>
          ) : (
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{isSubmitting ? '...' : t('common.save')}</button>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
