import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { renterFormSchema } from '../validation/renterValidation';
import { reconstructIntentFromLeaseYears } from '@/shared/utils/leaseSchedule';
import { LeaseTermBuilder } from '../components/LeaseTermBuilder';
import { useCreateRenter, useUpdateRenter, useRenter } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormFileInput } from '@/shared/components/form/FormFileInput';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { WheelDatePicker } from '@/shared/components/form/WheelDatePicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppAuth } from '@/core/auth/AuthContext';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { getApiErrorMessage } from '@/core/api/client';
import { ReviewBanner } from '@/features/document-scan/components/ReviewBanner';
import { FieldReviewProvider } from '@/shared/components/form/FieldReviewContext';
import { addressesMatch, type PropertyMatchStatus } from '@/features/document-scan/utils/matchProperty';
import type { ReviewItem, ProvenanceItem } from '@/features/document-scan/types';
import { diffProvenance, updateExtractionLog } from '@/features/document-scan/api/updateExtractionLog';
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
  /** Document-scan prefill: renter values, review items (uncertain fields) to flag, and
   *  the scanned lease to attach as the full contract on submit. */
  logId?: number;
  prefill?: Partial<FormData>;
  reviewItems?: ReviewItem[];
  provenance?: ProvenanceItem[];
  pendingContractFile?: File | null;
  /** Document-scan (renter target) property association. When set, the drawer shows the
   *  match hint / soft mismatch warning and, for `none`, a "create property from lease" action. */
  matchStatus?: PropertyMatchStatus;
  scannedLeaseAddress?: { address?: string | null; city?: string | null };
  onCreatePropertyFromScan?: () => void;
}

export function RenterFormDrawer({
  open,
  onClose,
  renterId,
  initialPropertyId,
  logId,
  prefill,
  reviewItems,
  provenance,
  pendingContractFile,
  matchStatus,
  scannedLeaseAddress,
  onCreatePropertyFromScan,
}: Props) {
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
  const [idImagePreview, setIdImagePreview] = useState<string | null>(null);
  const [fullContractFile, setFullContractFile] = useState<File | null>(null);

  const { register, handleSubmit, control, reset, trigger, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(renterFormSchema) as never,
    defaultValues: { leaseStart: '', leaseYears: [{ amount: '', type: 'contract' }], extraContacts: [], propertyId: '', paymentType: '', paymentDayOfMonth: '', contractTermYears: '', optionYears: '', baseRent: '', escalationMode: 'none', escalationValue: '' },
  });

  const { fields: contactFields, append: addContact, remove: removeContact } = useFieldArray({ control, name: 'extraContacts' });

  // Document-scan property association: warn (softly) when the chosen property's address
  // doesn't match the scanned lease. The dropdown always stays the source of truth.
  const selectedPropertyId = useWatch({ control, name: 'propertyId' });
  const propertyMismatch =
    !!scannedLeaseAddress?.address && !!selectedPropertyId
      ? (() => {
          const p = (properties ?? []).find((pp) => String(pp.id) === String(selectedPropertyId));
          return p ? !addressesMatch(p, scannedLeaseAddress) : false;
        })()
      : false;

  useEffect(() => {
    if (!open) { setStep(1); setShowDiscard(false); setIdImageFile(null); setIdImagePreview(null); setFullContractFile(null); }
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
      setIdImagePreview(existing.id_image_url ?? null);
    } else if (!renterId && open) {
      setIdImagePreview(null);
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
        ...(prefill ?? {}),
      });
      setFullContractFile(pendingContractFile ?? null);
    }
  }, [existing, open, renterId, initialPropertyId, reset, prefill, pendingContractFile]);

  const handleIdImageChange = (file: File | null) => {
    setIdImageFile(file);
    setIdImagePreview(file ? URL.createObjectURL(file) : (existing?.id_image_url ?? null));
  };

  const freqToPayments = (freq?: string) => freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'yearly' ? 1 : null;

  const onSubmit = handleSubmit(async (data) => {
    try {
      let idImageUrl = data.idImageUrl;
      let fullContractUrl = data.fullContractUrl;

      if (user) {
        if (idImageFile) idImageUrl = await uploadToFirebase(idImageFile, 'renters', user.uid);
        if (fullContractFile) fullContractUrl = await uploadToFirebase(fullContractFile, 'renters', user.uid);
      }

      // Cleared optionals must serialize as null (not undefined) so they survive
      // sanitizeRenterUpdate and actually clear the column on edit.
      const toNumOrNull = (v?: string) => {
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        // Send the email even when blank ('') so clearing it actually persists; collapsing
        // to undefined would make sanitizeRenterUpdate drop the key and keep the old value.
        email: data.email ?? '',
        property_id: data.propertyId ? Number(data.propertyId) : null,
        lease_start: data.leaseStart || null,
        lease_years: (data.leaseYears ?? []).map((ly: { amount: string; type?: 'option' | 'contract' }) => ({ amount: Number(ly.amount) || 0, type: ly.type ?? 'contract' })),
        contract_term_years: toNumOrNull(data.contractTermYears),
        option_years: toNumOrNull(data.optionYears),
        base_rent: toNumOrNull(data.baseRent),
        rent_escalation_mode: data.escalationMode ?? 'none',
        rent_escalation_value: toNumOrNull(data.escalationValue),
        payment_day_of_month: data.paymentDayOfMonth ? Number(data.paymentDayOfMonth) : null,
        payment_type: data.paymentType || null,
        number_of_payments: freqToPayments(data.paymentFrequency),
        extra_contacts: data.extraContacts ?? [],
        insurance_type: data.insuranceType || null,
        insurance_amount: data.insuranceAmount ? Number(data.insuranceAmount) : null,
        id_image_url: idImageUrl || null,
        full_contract_url: fullContractUrl || null,
      };

      if (isEditing && renterId) {
        await updateMutation.mutateAsync(payload);
      } else {
        const created = await createMutation.mutateAsync(payload as never);
        // Audit: record renter creation + which prefilled fields changed + the kept contract URL.
        if (logId && provenance) {
          updateExtractionLog(logId, {
            entity_type: 'renter',
            created_id: (created as { id?: number })?.id ?? null,
            contract_url: fullContractUrl ?? null,
            ...diffProvenance(provenance, data as Record<string, unknown>),
          });
        }
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

      <FieldReviewProvider items={reviewItems}>
      <form id="renter-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {step === 1 && <ReviewBanner items={reviewItems} />}
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
            {matchStatus === 'none' && !selectedPropertyId && (
              <div className="flex flex-col gap-1.5 -mt-2">
                <p className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠ {t('documentScan.couldntMatch')}</p>
                {onCreatePropertyFromScan && (
                  <button
                    type="button"
                    onClick={onCreatePropertyFromScan}
                    className="self-start text-xs font-medium hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('documentScan.createPropertyFromLease')}
                  </button>
                )}
              </div>
            )}
            {matchStatus === 'matched' && !!selectedPropertyId && !propertyMismatch && (
              <p className="text-xs -mt-2" style={{ color: 'var(--color-text-secondary)' }}>ⓘ {t('documentScan.matchedFromLease')}</p>
            )}
            {propertyMismatch && (
              <p className="text-xs -mt-2" style={{ color: 'var(--color-warning)' }}>⚠ {t('documentScan.propertyMismatchWarning')}</p>
            )}
            <FormFileInput
              label={t('documents.idImage')}
              accept="image/*"
              value={idImageFile}
              onChange={handleIdImageChange}
              preview={idImagePreview}
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
              <WheelDatePicker mode="date" label={t('renter.leaseStart')} value={field.value} onChange={(v) => field.onChange(v)} error={errors.leaseStart?.message} reviewName="leaseStart" />
            )} />
            <LeaseTermBuilder control={control} />
            <FormInput label={t('renter.paymentDay')} type="number" min={1} max={31} error={errors.paymentDayOfMonth?.message} {...register('paymentDayOfMonth')} />
            <Controller control={control} name="paymentType" render={({ field }) => (
              <FormSelect label={t('renter.paymentType')} value={field.value} onValueChange={field.onChange} options={paymentTypeOptions} placeholder={t('renter.selectPaymentType')} reviewName="paymentType" />
            )} />
            <Controller control={control} name="paymentFrequency" render={({ field }) => (
              <FormSelect label={t('renter.paymentFrequency')} value={field.value} onValueChange={field.onChange} options={paymentFrequencyOptions} placeholder={t('renter.selectPaymentFrequency')} reviewName="paymentFrequency" />
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller control={control} name="insuranceType" render={({ field }) => (
                <FormSelect label={t('renter.insuranceType')} value={field.value} onValueChange={field.onChange} options={insuranceTypeOptions} placeholder={t('common.optional')} reviewName="insuranceType" />
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
      </FieldReviewProvider>
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
