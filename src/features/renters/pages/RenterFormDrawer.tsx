import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray, useWatch, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Info, Plus, X } from 'lucide-react';
import { renterFormSchema } from '../validation/renterValidation';
import { reconstructIntentFromLeaseYears } from '@/shared/utils/leaseSchedule';
import { LeaseTermBuilder } from '../components/LeaseTermBuilder';
import { useCreateRenter, useUpdateRenter, useRenter } from '../queries';
import { useProperties } from '@/features/properties/queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { getPaymentMethodOptions } from '@/shared/constants/paymentMethods';
import { DEFAULT_PAYMENT_DAY } from '@/shared/constants/paymentDay';
import { FormFileInput } from '@/shared/components/form/FormFileInput';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { WheelDatePicker } from '@/shared/components/form/WheelDatePicker';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppAuth } from '@/core/auth/AuthContext';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { fileNameFromUrl } from '@/shared/utils/fileName';
import { getApiErrorMessage } from '@/core/api/client';
import { FieldReviewProvider } from '@/shared/components/form/FieldReviewContext';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour, useTourStep } from '@/features/onboarding/TourController';
import { addressesMatch, type PropertyMatchStatus } from '@/features/document-scan/utils/matchProperty';
import { diffScannedRenter, type RenterFieldConflict } from '@/features/document-scan/utils/diffRenter';
import { formatConflictValue } from '@/features/document-scan/utils/conflictValue';
import { FieldConflictToggle } from '@/features/document-scan/components/FieldConflictToggle';
import type { MappedRenter } from '@/features/document-scan/utils/mapExtraction';
import type { ReviewItem, ProvenanceItem } from '@/features/document-scan/types';
import { diffProvenance, updateExtractionLog } from '@/features/document-scan/api/updateExtractionLog';
import type { z } from 'zod';

type FormData = z.infer<typeof renterFormSchema>;
type LeaseYearFormValue = FormData['leaseYears'][number];

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
  /** Document-scan multi-renter queue: one entry per co-tenant on the lease. When provided,
   *  the drawer verifies each renter in turn (saving one advances to the next) and closes
   *  only after the last. Overrides the singular `prefill`/`reviewItems`/`provenance`. */
  renterQueue?: MappedRenter[];
  pendingContractFile?: File | null;
  /** Document-scan (renter target) property association. When set, the drawer shows the
   *  match hint / soft mismatch warning and, for `none`, a "create property from lease" action. */
  matchStatus?: PropertyMatchStatus;
  scannedLeaseAddress?: { address?: string | null; city?: string | null; floor?: string | number | null; apartment?: string | null };
  onCreatePropertyFromScan?: () => void;
}

/** See PropertyFormTourRequest — same reason, same shape. */
function RenterFormTourRequest() {
  useTour('lease-form');
  return null;
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
  renterQueue,
  pendingContractFile,
  matchStatus,
  scannedLeaseAddress,
  onCreatePropertyFromScan,
}: Props) {
  const { t } = useTranslation();

  // Multi-renter scan queue: which co-tenant we're currently verifying. Saving one advances
  // the cursor to the next; the drawer closes only after the last renter is saved.
  const [queueIndex, setQueueIndex] = useState(0);
  const queueTotal = renterQueue?.length ?? 0;
  const queued = queueTotal > queueIndex ? renterQueue![queueIndex] : undefined;
  const effPrefill = queued ? queued.prefill : prefill;
  const effReview = queued ? queued.review : reviewItems;
  const effProvenance = queued ? queued.provenance : provenance;
  const hasNextRenter = queueTotal > 0 && queueIndex < queueTotal - 1;

  // A scanned renter that matched an existing renter on the attached property is edited in place:
  // prefill from the stored record, fill blanks from the scan, and resolve field conflicts —
  // instead of creating a duplicate. `effRenterId` unifies that with the plain edit entry point.
  const queuedExistingId = queued?.existingRenterId ?? null;
  const effRenterId = queuedExistingId ?? renterId;
  const isEditing = !!effRenterId;
  const [renterConflicts, setRenterConflicts] = useState<RenterFieldConflict[]>([]);
  const [conflictChoices, setConflictChoices] = useState<Record<string, 'keep' | 'update'>>({});
  // The scanned lease vs. a contract the matched renter already has. Files live outside RHF, so
  // this conflict is tracked on its own instead of riding on the scalar `renterConflicts`.
  const [contractConflict, setContractConflict] = useState<{ existingUrl: string } | null>(null);
  const [contractChoice, setContractChoice] = useState<'keep' | 'update'>('keep');

  const { data: existing } = useRenter(effRenterId ?? 0);
  const { data: properties } = useProperties();
  const { user } = useAppAuth();
  const createMutation = useCreateRenter();
  const updateMutation = useUpdateRenter(effRenterId ?? 0);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const paymentAnchorRef = useTourAnchor(ANCHORS.renterFormPayment);

  // The lease tour used to be asked for from inside the term builder, which lives on page
  // two — so it could only ever open once the user was already there, and had nothing to say
  // about the form as a whole. It opens with the drawer now; the request is one render deeper
  // (see RenterFormTourRequest), and everything it points at is on page two, marked
  // `revealsAnchor`, which the line below is what reveals.
  const tourStep = useTourStep('lease-form');
  // Derived, never written — see PropertyFormDrawer for why that matters.
  const shownStep = tourStep && tourStep !== 'overview' ? 2 : step;
  const [showDiscard, setShowDiscard] = useState(false);
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [idImagePreview, setIdImagePreview] = useState<string | null>(null);
  const [fullContractFile, setFullContractFile] = useState<File | null>(null);

  const { register, handleSubmit, control, reset, trigger, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(renterFormSchema) as never,
    // paymentDayOfMonth defaults to '1' rather than '' because the overdue engine treats a
    // missing day as the 1st. Leaving it blank meant rent was chased on a day the owner was
    // never shown; pre-filling discloses the default and leaves it editable.
    defaultValues: { leaseStart: '', leaseYears: [{ amount: '', type: 'contract' }], extraContacts: [], propertyId: '', paymentType: '', paymentDayOfMonth: DEFAULT_PAYMENT_DAY, contractTermYears: '', contractTermMonths: '', optionYears: '', optionTermMonths: '', baseRent: '', escalationMode: 'none', escalationValue: '' },
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
    if (!open) { setStep(1); setShowDiscard(false); setIdImageFile(null); setIdImagePreview(null); setFullContractFile(null); setQueueIndex(0); setRenterConflicts([]); setConflictChoices({}); setContractConflict(null); setContractChoice('keep'); }
  }, [open]);

  // Files live outside RHF, so isDirty alone misses them. Scanner prefill lives in the form's
  // defaultValues, so RHF reports isDirty=false even though there's reviewed data to lose.
  const hasScanPrefill = (!isEditing || queuedExistingId != null) && (!!effPrefill || (renterQueue?.length ?? 0) > 0);
  const dirty = isDirty || !!idImageFile || !!fullContractFile || hasScanPrefill;
  const attemptClose = () => { if (dirty) setShowDiscard(true); else onClose(); };

  useEffect(() => {
    if (existing && open) {
      const numPayments = existing.number_of_payments;
      const paymentFrequency = numPayments === 12 ? 'monthly' : numPayments === 4 ? 'quarterly' : numPayments === 1 ? 'yearly' : undefined;
      // Prefer the structured intent the backend persisted; otherwise infer it from
      // the materialized lease_years so the builder re-opens sensibly.
      // The stored intent records whole years only; the odd months live in the
      // schedule, so they are always recovered from it. Taking them from the stored
      // fields alone would drop a short tail on the next save.
      const fromSchedule = reconstructIntentFromLeaseYears(existing.lease_years);
      const intent =
        existing.contract_term_years != null
          ? {
              contractTermYears: String(existing.contract_term_years ?? 0),
              contractTermMonths: String(
                existing.contract_term_months ?? fromSchedule.contractTermMonths,
              ),
              optionYears: String(existing.option_years ?? 0),
              optionTermMonths: String(
                existing.option_term_months ?? fromSchedule.optionTermMonths,
              ),
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
          : {
              contractTermYears: fromSchedule.contractTermYears
                ? String(fromSchedule.contractTermYears)
                : '',
              contractTermMonths: String(fromSchedule.contractTermMonths),
              optionYears: fromSchedule.optionYears ? String(fromSchedule.optionYears) : '',
              optionTermMonths: String(fromSchedule.optionTermMonths),
              baseRent: fromSchedule.baseRent ? String(fromSchedule.baseRent) : '',
              escalationMode: fromSchedule.escalationMode,
              escalationValue: '',
            };
      const existingReset: DefaultValues<FormData> = {
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone,
        email: existing.email ?? '',
        propertyId: (existing.property_id ?? existing.property?.id)?.toString() ?? '',
        leaseStart: existing.lease_start ?? '',
        ...intent,
        leaseYears: existing.lease_years.map((ly) => ({
          amount: ly.amount.toString(),
          type: ly.type,
          ...(ly.months != null ? { months: ly.months } : {}),
          // Rules round-trip as form strings; an absent rule stays absent (= manual).
          ...(ly.rule
            ? { rule: { mode: ly.rule.mode, value: ly.rule.value != null ? String(ly.rule.value) : '' } }
            : {}),
        })),
        paymentDayOfMonth: existing.payment_day_of_month?.toString() ?? DEFAULT_PAYMENT_DAY,
        // Map the legacy 'wire_transfer' value onto the canonical option so it stays selected
        // in the dropdown; leave empty/other values untouched.
        paymentType: existing.payment_type === 'wire_transfer' ? 'bank_transfer' : (existing.payment_type ?? undefined),
        paymentFrequency,
        extraContacts: existing.extra_contacts ?? [],
        insuranceType: (existing.insurance_type as 'wire_transfer' | 'bank_guarantee' | '' | undefined) ?? '',
        insuranceAmount: existing.insurance_amount?.toString() ?? '',
        idImageUrl: existing.id_image_url ?? undefined,
        fullContractUrl: existing.full_contract_url ?? undefined,
      };
      // Duplicate scan entry: overlay scan values onto the existing renter — fill the fields it
      // left blank silently, and surface the ones that differ for the user to keep or replace.
      if (queuedExistingId != null && effPrefill) {
        const labelByKey = new Map((effProvenance ?? []).map((pv) => [pv.formKey, pv.labelKey] as [string, string]));
        const { fills, conflicts } = diffScannedRenter(effPrefill, existingReset, labelByKey);
        reset({ ...existingReset, ...fills });
        setRenterConflicts(conflicts);
        // The scanned lease is the renter's contract: attach it silently when they have none (the
        // file analogue of a `fill`), or offer keep/replace when a stored contract already exists.
        if (pendingContractFile && existing.full_contract_url) {
          setContractConflict({ existingUrl: existing.full_contract_url });
          setContractChoice('keep');
          setFullContractFile(null);
        } else {
          setContractConflict(null);
          setFullContractFile(pendingContractFile ?? null);
        }
      } else {
        reset(existingReset);
        setRenterConflicts([]);
        setContractConflict(null);
      }
      setConflictChoices({});
      setIdImagePreview(existing.id_image_url ?? null);
    } else if (!effRenterId && open) {
      setRenterConflicts([]);
      setConflictChoices({});
      setContractConflict(null);
      setIdImageFile(null);
      setIdImagePreview(null);
      reset({
        leaseStart: '',
        leaseYears: [{ amount: '', type: 'contract' }],
        extraContacts: [],
        propertyId: initialPropertyId?.toString() ?? '',
        paymentType: '',
        paymentDayOfMonth: DEFAULT_PAYMENT_DAY,
        contractTermYears: '',
        contractTermMonths: '',
        optionYears: '',
        optionTermMonths: '',
        baseRent: '',
        escalationMode: 'none',
        escalationValue: '',
        ...(effPrefill ?? {}),
      });
      setFullContractFile(pendingContractFile ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effPrefill tracked via queueIndex; re-runs to load each queued renter
  }, [existing, open, renterId, initialPropertyId, reset, prefill, queueIndex, renterQueue, pendingContractFile]);

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
        lease_years: (data.leaseYears ?? []).map((ly: LeaseYearFormValue) => ({
          amount: Number(ly.amount) || 0,
          type: ly.type ?? 'contract',
          // Absent means twelve, so only a short tail carries it and an ordinary lease's
          // payload stays exactly the shape it has always been.
          ...(ly.months && ly.months < 12 ? { months: ly.months } : {}),
          // Per-year rules only exist in custom mode, and "manual" is the absence of a
          // rule — omit it so the payload stays the legacy shape for every other lease.
          ...(data.escalationMode === 'custom' && ly.rule && ly.rule.mode !== 'manual'
            ? { rule: { mode: ly.rule.mode, value: ly.rule.value ? Number(ly.rule.value) : undefined } }
            : {}),
        })),
        contract_term_years: toNumOrNull(data.contractTermYears),
        contract_term_months: toNumOrNull(data.contractTermMonths),
        option_years: toNumOrNull(data.optionYears),
        option_term_months: toNumOrNull(data.optionTermMonths),
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

      if (isEditing && effRenterId) {
        await updateMutation.mutateAsync(payload);
        // Audit a scanned duplicate merged into an existing renter, same as a creation.
        if (queuedExistingId != null && logId && effProvenance) {
          updateExtractionLog(logId, {
            entity_type: 'renter',
            created_id: effRenterId,
            contract_url: fullContractUrl ?? null,
            ...diffProvenance(effProvenance, data as Record<string, unknown>),
          });
        }
      } else {
        const created = await createMutation.mutateAsync(payload as never);
        // Audit: record renter creation + which prefilled fields changed + the kept contract URL.
        if (logId && effProvenance) {
          updateExtractionLog(logId, {
            entity_type: 'renter',
            created_id: (created as { id?: number })?.id ?? null,
            contract_url: fullContractUrl ?? null,
            ...diffProvenance(effProvenance, data as Record<string, unknown>),
          });
        }
      }

      showToast(t(isEditing ? 'renter.updateSuccess' : 'renter.createSuccess'), 'success');
      // Multi-renter scan: advance to the next co-tenant instead of closing — including when the
      // just-saved entry was an in-place edit of an existing (duplicate) renter.
      if (hasNextRenter) {
        setStep(1);
        setQueueIndex((i) => i + 1);
      } else {
        onClose();
      }
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
  // Renter payment_type shares the transaction payment-method domain
  // (cash | bank_transfer | bit | check). Legacy 'wire_transfer' values are still read via
  // normalizePaymentType / getPaymentMethodLabel.
  const paymentTypeOptions = getPaymentMethodOptions(t);
  const paymentFrequencyOptions = [
    { value: 'monthly', label: t('renter.frequencyMonthly') },
    { value: 'quarterly', label: t('renter.frequencyQuarterly') },
    { value: 'yearly', label: t('renter.frequencyYearly') },
  ];
  const insuranceTypeOptions = [
    { value: 'wire_transfer', label: t('renter.insuranceTypeWireTransfer') },
    { value: 'bank_guarantee', label: t('renter.insuranceTypeBankGuarantee') },
  ];

  // Follows the page on show, so a demonstrated page two is not sitting above a "Next"
  // button. Unreachable while the tour is up — the overlay swallows clicks outside its card.
  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={step === 2 ? () => setStep(1) : attemptClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {shownStep === 2 ? t('common.back') : t('common.cancel')}
      </button>
      {shownStep === 1 ? (
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
          {isSubmitting ? '...' : hasNextRenter ? t('documentScan.saveAndNextRenter') : t('common.save')}
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
      {/* Multi-renter scan progress (which co-tenant of N we're verifying) */}
      {queueTotal > 1 && (
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
          {t('documentScan.renterProgress', { current: queueIndex + 1, total: queueTotal })}
        </p>
      )}

      <RenterFormTourRequest />
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= shownStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
        ))}
        <span className="ms-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{shownStep}/2</span>
      </div>

      <FieldReviewProvider items={effReview}>
      {/* noValidate: let zod be the sole validator. Otherwise native HTML5 constraint
          validation on the number inputs silently cancels submit when a field holds
          "bad input" (a stray 'e', '-', double '.', …) — it renders blank but blocks
          the submit event before RHF/zod ever run, so Save does nothing with no error. */}
      <form id="renter-form" onSubmit={onSubmit} autoComplete="off" noValidate className="flex flex-col gap-4">
        {shownStep === 1 ? (
          <>
            {(renterConflicts.length > 0 || contractConflict) && (
              <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)' }}>
                <div>
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('documentScan.conflictsTitle')}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('documentScan.renterConflictsHint')}
                  </p>
                </div>
                {renterConflicts.map((c) => (
                  <FieldConflictToggle
                    key={c.formKey}
                    label={t(c.labelKey)}
                    existing={formatConflictValue(c.formKey, c.existing, t)}
                    scanned={formatConflictValue(c.formKey, c.scanned, t)}
                    choice={conflictChoices[c.formKey] ?? 'keep'}
                    onChange={(mode) => {
                      setConflictChoices((prev) => ({ ...prev, [c.formKey]: mode }));
                      setValue(c.formKey as keyof FormData, (mode === 'update' ? c.scanned : c.existing) as never, { shouldDirty: true });
                    }}
                  />
                ))}
                {contractConflict && pendingContractFile && (
                  <FieldConflictToggle
                    label={t('documents.fullContract')}
                    existing={fileNameFromUrl(contractConflict.existingUrl)}
                    scanned={pendingContractFile.name}
                    choice={contractChoice}
                    onChange={(mode) => {
                      setContractChoice(mode);
                      // 'update' stages the scanned lease for upload on submit and drops the stored
                      // URL; 'keep' restores it. Either way the step-2 document input follows.
                      if (mode === 'update') {
                        setFullContractFile(pendingContractFile);
                        setValue('fullContractUrl', undefined, { shouldDirty: true });
                      } else {
                        setFullContractFile(null);
                        setValue('fullContractUrl', contractConflict.existingUrl, { shouldDirty: true });
                      }
                    }}
                  />
                )}
              </div>
            )}
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
                <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-warning)' }}>
                  <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
                  <span>{t('documentScan.couldntMatch')}</span>
                </p>
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
              <p className="flex items-center gap-1 text-xs -mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                <Info size={13} className="shrink-0" aria-hidden="true" />
                <span>{t('documentScan.matchedFromLease')}</span>
              </p>
            )}
            {propertyMismatch && (
              <p className="flex items-center gap-1 text-xs -mt-2" style={{ color: 'var(--color-warning)' }}>
                <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
                <span>{t('documentScan.propertyMismatchWarning')}</span>
              </p>
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
            <LeaseTermBuilder control={control} setValue={setValue} />
            {/* Day, type and frequency as one group — the tour's point is about the three
                together, and the day in particular is what "overdue" is counted from. */}
            <div ref={paymentAnchorRef} className="flex flex-col gap-4">
            <FormInput label={t('renter.paymentDay')} type="number" min={1} max={31} hint={t('renter.paymentDayHint')} error={errors.paymentDayOfMonth?.message} {...register('paymentDayOfMonth')} />
            <Controller control={control} name="paymentType" render={({ field }) => (
              <FormSelect label={t('renter.paymentType')} value={field.value} onValueChange={field.onChange} options={paymentTypeOptions} sorted={false} placeholder={t('renter.selectPaymentType')} reviewName="paymentType" />
            )} />
            <Controller control={control} name="paymentFrequency" render={({ field }) => (
              <FormSelect label={t('renter.paymentFrequency')} value={field.value} onValueChange={field.onChange} options={paymentFrequencyOptions} sorted={false} placeholder={t('renter.selectPaymentFrequency')} reviewName="paymentFrequency" />
            )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller control={control} name="insuranceType" render={({ field }) => (
                <FormSelect label={t('renter.insuranceType')} value={field.value} onValueChange={field.onChange} options={insuranceTypeOptions} placeholder={t('common.optional')} reviewName="insuranceType" />
              )} />
              <FormInput label={t('renter.insuranceAmount')} type="number" error={errors.insuranceAmount?.message} {...register('insuranceAmount')} />
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
