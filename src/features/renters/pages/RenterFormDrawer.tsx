import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { renterFormSchema } from '../validation/renterValidation';
import { reconstructIntentFromLeaseYears } from '@/shared/utils/leaseSchedule';
import { LeaseTermBuilder } from '../components/LeaseTermBuilder';
import { useCreateRenter, useUpdateRenter, useRenter } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { WheelDatePicker } from '@/shared/components/form/WheelDatePicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppAuth } from '@/core/auth/AuthContext';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { getApiErrorMessage } from '@/core/api/client';
import type { z } from 'zod';

type FormData = z.infer<typeof renterFormSchema>;

// Every field rendered on step 1 — validated together on "Next" so invalid values
// surface inline at the page transition instead of silently failing on Save.
const STEP_1_FIELDS = [
  'firstName', 'lastName', 'phone', 'email', 'propertyId', 'extraContacts',
] as const satisfies readonly (keyof FormData)[];

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
  const { user } = useAppAuth();
  const createMutation = useCreateRenter();
  const updateMutation = useUpdateRenter(renterId ?? 0);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [showDiscard, setShowDiscard] = useState(false);
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [fullContractFile, setFullContractFile] = useState<File | null>(null);

  const { register, handleSubmit, control, reset, trigger, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(renterFormSchema) as never,
    defaultValues: { leaseStart: '', leaseYears: [{ amount: '', type: 'contract' }], extraContacts: [], propertyId: '', paymentType: '', paymentDayOfMonth: '', contractTermYears: '', optionYears: '', baseRent: '', escalationMode: 'none', escalationValue: '' },
  });

  const { fields: contactFields, append: addContact, remove: removeContact } = useFieldArray({ control, name: 'extraContacts' });

  useEffect(() => {
    if (!open) { setStep(1); setShowDiscard(false); setIdImageFile(null); setFullContractFile(null); }
  }, [open]);

  // Files live outside RHF, so isDirty alone misses them.
  const dirty = isDirty || !!idImageFile || !!fullContractFile;
  const attemptClose = () => { if (dirty) setShowDiscard(true); else onClose(); };

  useEffect(() => {
    if (existing && open) {
      const numPayments = existing.number_of_payments;
      const paymentFrequency = numPayments === 12 ? 'monthly' : numPayments === 4 ? 'quarterly' : numPayments === 1 ? 'yearly' : undefined;
      // Prefer the structured intent the backend persisted; otherwise infer it from
      // the materialized lease_years so the builder re-opens sensibly.
      const intent =
        existing.contract_term_years != null
          ? {
              contractTermYears: String(existing.contract_term_years ?? 0),
              optionYears: String(existing.option_years ?? 0),
              baseRent:
                existing.base_rent != null
                  ? String(existing.base_rent)
                  : existing.lease_years[0]?.amount != null
                  ? String(existing.lease_years[0].amount)
                  : '',
              escalationMode: existing.rent_escalation_mode ?? 'none',
              escalationValue:
                existing.rent_escalation_value != null ? String(existing.rent_escalation_value) : '',
            }
          : (() => {
              const r = reconstructIntentFromLeaseYears(existing.lease_years);
              return {
                contractTermYears: r.contractTermYears ? String(r.contractTermYears) : '',
                optionYears: r.optionYears ? String(r.optionYears) : '',
                baseRent: r.baseRent ? String(r.baseRent) : '',
                escalationMode: r.escalationMode,
                escalationValue: '',
              };
            })();
      reset({
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone,
        email: existing.email ?? '',
        propertyId: (existing.property_id ?? existing.property?.id)?.toString() ?? '',
        leaseStart: existing.lease_start ?? '',
        ...intent,
        leaseYears: existing.lease_years.map((ly) => ({ amount: ly.amount.toString(), type: ly.type })),
        paymentDayOfMonth: existing.payment_day_of_month?.toString() ?? '',
        paymentType: existing.payment_type ?? undefined,
        paymentFrequency,
        extraContacts: existing.extra_contacts ?? [],
        insuranceType: (existing.insurance_type as 'wire_transfer' | 'bank_guarantee' | '' | undefined) ?? '',
        insuranceAmount: existing.insurance_amount?.toString() ?? '',
        idImageUrl: existing.id_image_url ?? undefined,
        fullContractUrl: existing.full_contract_url ?? undefined,
      });
    } else if (!renterId && open) {
      reset({
        leaseStart: '',
        leaseYears: [{ amount: '', type: 'contract' }],
        extraContacts: [],
        propertyId: initialPropertyId?.toString() ?? '',
        paymentType: '',
        paymentDayOfMonth: '',
        contractTermYears: '',
        optionYears: '',
        baseRent: '',
        escalationMode: 'none',
        escalationValue: '',
      });
    }
  }, [existing, open, renterId, initialPropertyId, reset]);

  const freqToPayments = (freq?: string) => freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'yearly' ? 1 : undefined;

  const onSubmit = handleSubmit(async (data) => {
    try {
      let idImageUrl = data.idImageUrl;
      let fullContractUrl = data.fullContractUrl;

      if (user) {
        if (idImageFile) idImageUrl = await uploadToFirebase(idImageFile, 'renters', user.uid);
        if (fullContractFile) fullContractUrl = await uploadToFirebase(fullContractFile, 'renters', user.uid);
      }

      const toNumOrUndef = (v?: string) => {
        if (!v) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        property_id: data.propertyId ? Number(data.propertyId) : null,
        lease_start: data.leaseStart || undefined,
        lease_years: (data.leaseYears ?? []).map((ly: { amount: string; type?: 'option' | 'contract' }) => ({ amount: Number(ly.amount) || 0, type: ly.type ?? 'contract' })),
        contract_term_years: toNumOrUndef(data.contractTermYears),
        option_years: toNumOrUndef(data.optionYears),
        base_rent: toNumOrUndef(data.baseRent),
        rent_escalation_mode: data.escalationMode ?? 'none',
        rent_escalation_value: toNumOrUndef(data.escalationValue),
        payment_day_of_month: data.paymentDayOfMonth ? Number(data.paymentDayOfMonth) : undefined,
        payment_type: data.paymentType || undefined,
        number_of_payments: freqToPayments(data.paymentFrequency),
        extra_contacts: data.extraContacts ?? [],
        insurance_type: data.insuranceType || undefined,
        insurance_amount: data.insuranceAmount ? Number(data.insuranceAmount) : undefined,
        id_image_url: idImageUrl || undefined,
        full_contract_url: fullContractUrl || undefined,
      };

      if (isEditing && renterId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload as never);
      }

      showToast(t(isEditing ? 'renter.updateSuccess' : 'renter.createSuccess'), 'success');
      onClose();
    } catch (err) { if (import.meta.env.DEV) console.error('[RenterFormDrawer] save failed:', err); showToast(getApiErrorMessage(err, t('error.saveFailed')), 'error'); }
  });

  const propertyOptions = (() => {
    const opts = (properties ?? []).map((p) => ({ value: p.id.toString(), label: `${p.address}${formatFloorApartment(p, t)}, ${p.city}` }));
    const linked = existing?.property;
    if (linked && !opts.some((o) => o.value === String(linked.id))) {
      opts.unshift({ value: String(linked.id), label: `${linked.address}${formatFloorApartment(linked, t)}, ${linked.city}` });
    }
    return opts;
  })();
  // Renter payment_type domain is cash | wire_transfer | bit (see mapPaymentType in
  // AlertsPanel / NeedsAttentionSection and the renter.paymentType* i18n keys). Note this
  // differs from the transaction payment-method domain (which uses 'bank_transfer').
  const paymentTypeOptions = [
    { value: 'cash', label: t('renter.paymentTypeCash') },
    { value: 'wire_transfer', label: t('renter.paymentTypeWireTransfer') },
    { value: 'bit', label: t('renter.paymentTypeBit') },
  ];
  const paymentFrequencyOptions = [
    { value: 'monthly', label: t('renter.frequencyMonthly') },
    { value: 'quarterly', label: t('renter.frequencyQuarterly') },
    { value: 'yearly', label: t('renter.frequencyYearly') },
  ];
  const insuranceTypeOptions = [
    { value: 'wire_transfer', label: t('renter.insuranceTypeWireTransfer') },
    { value: 'bank_guarantee', label: t('renter.insuranceTypeBankGuarantee') },
  ];

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={step === 2 ? () => setStep(1) : attemptClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {step === 2 ? t('common.back') : t('common.cancel')}
      </button>
      {step === 1 ? (
        <button
          key="next"
          type="button"
          onClick={async () => {
            const ok = await trigger(STEP_1_FIELDS);
            if (ok) setStep(2);
          }}
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
    <>
    <Drawer
      open={open}
      onClose={onClose}
      onRequestClose={attemptClose}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('renter.firstName')} required error={errors.firstName?.message} {...register('firstName')} />
              <FormInput label={t('renter.lastName')} required error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <FormInput label={t('renter.phone')} type="tel" required error={errors.phone?.message} {...register('phone')} />
            <FormInput label={t('renter.email')} type="email" error={errors.email?.message} {...register('email')} />
            <Controller control={control} name="propertyId" render={({ field }) => (
              <FormSelect label={t('renter.property')} value={field.value} onValueChange={field.onChange} options={propertyOptions} placeholder={t('renter.selectProperty')} />
            )} />
            <Controller
              control={control}
              name="idImageUrl"
              render={({ field }) => (
                <FormDocumentInput
                  label={t('documents.idImage')}
                  accept="image/*,.pdf"
                  existingUrl={field.value ?? null}
                  pendingFile={idImageFile}
                  onChange={(f) => { setIdImageFile(f); if (f) field.onChange(undefined); }}
                  onRemoveExisting={() => field.onChange(null)}
                />
              )}
            />
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
            <LeaseTermBuilder control={control} />
            <Controller control={control} name="paymentDayOfMonth" render={({ field }) => (
              <WheelDatePicker mode="day" label={t('renter.paymentDay')} value={field.value ? Number(field.value) : undefined} onChange={(v) => field.onChange(String(v))} error={errors.paymentDayOfMonth?.message} />
            )} />
            <Controller control={control} name="paymentType" render={({ field }) => (
              <FormSelect label={t('renter.paymentType')} value={field.value} onValueChange={field.onChange} options={paymentTypeOptions} placeholder={t('renter.selectPaymentType')} />
            )} />
            <Controller control={control} name="paymentFrequency" render={({ field }) => (
              <FormSelect label={t('renter.paymentFrequency')} value={field.value} onValueChange={field.onChange} options={paymentFrequencyOptions} placeholder={t('renter.selectPaymentFrequency')} />
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller control={control} name="insuranceType" render={({ field }) => (
                <FormSelect label={t('renter.insuranceType')} value={field.value} onValueChange={field.onChange} options={insuranceTypeOptions} placeholder={t('common.optional')} />
              )} />
              <FormInput label={t('renter.insuranceAmount')} type="number" {...register('insuranceAmount')} />
            </div>
            <Controller
              control={control}
              name="fullContractUrl"
              render={({ field }) => (
                <FormDocumentInput
                  label={t('documents.fullContract')}
                  existingUrl={field.value ?? null}
                  pendingFile={fullContractFile}
                  onChange={(f) => { setFullContractFile(f); if (f) field.onChange(undefined); }}
                  onRemoveExisting={() => field.onChange(null)}
                />
              )}
            />
          </>
        )}
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
