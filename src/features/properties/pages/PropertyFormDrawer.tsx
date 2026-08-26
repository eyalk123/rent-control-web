import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { propertyFormSchema, PROPERTY_TYPES } from '../validation/propertyValidation';
import { useCreateProperty, useUpdateProperty, useProperty, useProperties } from '../queries';
import { useAppAuth } from '@/core/auth/AuthContext';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { FormChipInput } from '@/shared/components/form/FormChipInput';
import { FormCreatableSelect } from '@/shared/components/form/FormCreatableSelect';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { PropertyCreatedPrompt } from '../components/PropertyCreatedPrompt';
import { RenterFormDrawer } from '@/features/renters/pages/RenterFormDrawer';
import { useToast } from '@/shared/components/ui/Toast';
import type { z } from 'zod';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { getPropertyImageSrc } from '../utils/propertyImageSrc';
import { PropertyImageField } from '../components/PropertyImageField';
import { parseImageUrlKey } from '../constants/houseImagePresets';
import { FieldReviewProvider } from '@/shared/components/form/FieldReviewContext';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';
import type { ReviewItem, ProvenanceItem } from '@/features/document-scan/types';
import type { MappedRenter } from '@/features/document-scan/utils/mapExtraction';
import { diffProvenance, updateExtractionLog } from '@/features/document-scan/api/updateExtractionLog';
import { diffScannedPropertyForm, type PropertyFormFieldConflict } from '@/features/document-scan/utils/diffProperty';
import { FieldConflictToggle } from '@/features/document-scan/components/FieldConflictToggle';

type FormData = z.infer<typeof propertyFormSchema>;

// Every field rendered on step 1 — validated together on "Next" so invalid values
// (e.g. a non-numeric block/plot) surface inline at the page transition instead of
// silently failing on Save from a hidden step.
const STEP_1_FIELDS = [
  'address', 'floor', 'apartment', 'city', 'block', 'plot',
  'zipCode', 'sqFt', 'type', 'numberOfRooms', 'parkingNumbersStr',
] as const satisfies readonly (keyof FormData)[];

const EMPTY_FORM: FormData = {
  address: '', city: '', block: '', plot: '', zipCode: '', type: '' as FormData['type'],
  sqFt: '', numberOfRooms: '', parkingNumbersStr: '', propertyOwner: '',
  inventoryNotes: '', electricityMeterNumber: '', electricityAccountNumber: '',
  waterMeterNumber: '', waterAccountNumber: '', propertyTax: '', houseCommittee: '',
  floor: '', apartment: '', basicContractUrl: undefined, landRegistryUrl: undefined,
};

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId?: number;
  /** Document-scan prefill: property values + review items (uncertain fields) to flag,
   *  plus renter values forwarded to the chained renter drawer after creation. */
  logId?: number;
  prefill?: Partial<FormData>;
  reviewItems?: ReviewItem[];
  provenance?: ProvenanceItem[];
  /** Debug hint: the verbatim clause the scan based the property address on. Shown under the
   *  address field for scanned entries so a wrong address can be diagnosed. */
  addressEvidence?: string | null;
  /** Document-scan renter queue forwarded to the chained renter drawer after the property
   *  is created (one entry per co-tenant; verified in sequence). */
  renterQueue?: MappedRenter[];
  renterContractFile?: File | null;
}

/**
 * Step two owns the owner field — one of the tour's two anchors — so the request lives
 * with it. Asking from the drawer would ask while the user is still on step one, find the
 * owner field unmounted, and defer a tour that was one click away from being showable.
 */
function PropertyFormTourRequest() {
  useTour('property-form');
  return null;
}

export function PropertyFormDrawer({
  open,
  onClose,
  propertyId,
  logId,
  prefill,
  reviewItems,
  provenance,
  addressEvidence,
  renterQueue,
  renterContractFile,
}: Props) {
  const { t } = useTranslation();
  const isEditing = !!propertyId;

  const { data: existing } = useProperty(propertyId ?? 0);
  const { data: allProperties = [] } = useProperties();
  const { user } = useAppAuth();
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty(propertyId ?? 0);

  // FormCreatableSelect applies the locale-aware ordering.
  const ownerOptions = useMemo(() =>
    Array.from(new Set(
      allProperties
        .map((p) => p.property_owner?.trim())
        .filter((o): o is string => !!o)
    )),
  [allProperties]);
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const stepperAnchorRef = useTourAnchor(ANCHORS.propertyFormStepper);
  const ownerAnchorRef = useTourAnchor(ANCHORS.propertyFormOwnerField);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showRenterPrompt, setShowRenterPrompt] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);
  const [renterDrawerOpen, setRenterDrawerOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // `rc-house:<key>` sentinel for the currently-shown preset illustration; null for a custom
  // upload, an existing non-preset image, or no image.
  const [imagePresetUrl, setImagePresetUrl] = useState<string | null>(null);
  // True once the user touches the image field (upload / pick preset / remove). Distinguishes a
  // preset loaded from the existing property from one the user actively chose, so opening the
  // edit drawer doesn't count as a change and submit only writes image_url when it changed.
  const [imageDirty, setImageDirty] = useState(false);
  const [basicContractFile, setBasicContractFile] = useState<File | null>(null);
  const [landRegistryFile, setLandRegistryFile] = useState<File | null>(null);
  // Scan-attach-to-existing: fields where the lease disagrees with the stored property, for the
  // user to keep or replace (mirrors the renter form). Only populated when editing via a scan.
  const [propertyConflicts, setPropertyConflicts] = useState<PropertyFormFieldConflict[]>([]);
  const [conflictChoices, setConflictChoices] = useState<Record<string, 'keep' | 'update'>>({});

  const { register, handleSubmit, control, reset, trigger, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(propertyFormSchema) as never,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) { setStep(1); setShowDiscard(false); setImageFile(null); setImagePresetUrl(null); setImageDirty(false); setBasicContractFile(null); setLandRegistryFile(null); setPropertyConflicts([]); setConflictChoices({}); }
  }, [open]);

  // Whether this is a scan attaching to an existing property (edit mode with scan prefill) — the
  // one case where the edit form carries scanner data + conflicts to review.
  const isScanEdit = isEditing && !!prefill;
  // Files live outside RHF, so isDirty alone misses them. Scanner prefill lives in the form's
  // defaultValues, so RHF reports isDirty=false even though there's reviewed data to lose.
  const hasScanPrefill = !!prefill;
  const dirty = isDirty || !!imageFile || imageDirty || !!basicContractFile || !!landRegistryFile || hasScanPrefill || propertyConflicts.length > 0;
  const attemptClose = () => { if (dirty) setShowDiscard(true); else onClose(); };

  useEffect(() => {
    if (existing && open) {
      const existingReset: DefaultValues<FormData> = {
        address: existing.address,
        city: existing.city,
        block: existing.block ?? '',
        plot: existing.plot ?? '',
        zipCode: existing.zip_code ?? '',
        type: existing.type,
        sqFt: existing.sq_ft?.toString() ?? '',
        propertyOwner: existing.property_owner ?? '',
        inventoryNotes: existing.inventory_notes ?? '',
        floor: existing.floor?.toString() ?? '',
        apartment: existing.apartment ?? '',
        propertyTax: existing.property_tax?.toString() ?? '',
        houseCommittee: existing.house_committee?.toString() ?? '',
        electricityMeterNumber: existing.electricity_meter_number ?? '',
        electricityAccountNumber: existing.electricity_account_number ?? '',
        waterMeterNumber: existing.water_meter_number ?? '',
        waterAccountNumber: existing.water_account_number ?? '',
        numberOfRooms: existing.number_of_rooms?.toString() ?? '',
        parkingNumbersStr: existing.parking_numbers?.join(', ') ?? '',
        basicContractUrl: existing.basic_contract_url ?? undefined,
        landRegistryUrl: existing.land_registry_url ?? undefined,
      };
      // Scan attaching to this property: overlay the lease — fill the fields it left blank
      // (silent) and surface the ones that differ for the user to keep or replace.
      if (prefill) {
        const { fills, conflicts } = diffScannedPropertyForm(prefill as Record<string, unknown>, existingReset as Record<string, unknown>);
        reset({ ...existingReset, ...fills });
        setPropertyConflicts(conflicts);
      } else {
        reset(existingReset);
        setPropertyConflicts([]);
      }
      setConflictChoices({});
      setImagePreview(getPropertyImageSrc(existing.image_url));
      setImagePresetUrl(existing.image_url?.startsWith('rc-house:') ? existing.image_url : null);
      setImageDirty(false);
    } else if (!propertyId && open) {
      reset({ ...EMPTY_FORM, ...(prefill ?? {}) });
      setPropertyConflicts([]);
      setConflictChoices({});
      setImagePreview(null);
      setImagePresetUrl(null);
      setImageDirty(false);
    }
  }, [existing, open, propertyId, reset, prefill]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    setImagePresetUrl(null);
    setImageDirty(true);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSelectPreset = (imageUrlValue: string) => {
    setImagePresetUrl(imageUrlValue);
    setImageFile(null);
    setImageDirty(true);
    setImagePreview(getPropertyImageSrc(imageUrlValue));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePresetUrl(null);
    setImageDirty(true);
    setImagePreview(null);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      // image_url resolution: an untouched field stays undefined so the stored value is preserved;
      // once touched, a chosen preset sends its sentinel and a removal sends null. A new upload
      // (handled below) wins over both.
      let imageUrl: string | null | undefined = imageDirty ? imagePresetUrl : undefined;
      let basicContractUrl = data.basicContractUrl ?? null;
      let landRegistryUrl = data.landRegistryUrl ?? null;

      if (user) {
        if (imageFile) imageUrl = await uploadToFirebase(imageFile, 'properties', user.uid);
        if (basicContractFile) basicContractUrl = await uploadToFirebase(basicContractFile, 'properties', user.uid);
        if (landRegistryFile) landRegistryUrl = await uploadToFirebase(landRegistryFile, 'properties', user.uid);
      }

      const payload = {
        address: data.address,
        city: data.city,
        block: data.block || null,
        plot: data.plot || null,
        zip_code: data.zipCode || '',
        type: data.type,
        sq_ft: data.sqFt ? Number(data.sqFt) : 0,
        property_owner: data.propertyOwner || null,
        inventory_notes: data.inventoryNotes || null,
        floor: data.floor ? Number(data.floor) : null,
        apartment: data.apartment || null,
        property_tax: data.propertyTax ? Number(data.propertyTax) : null,
        house_committee: data.houseCommittee ? Number(data.houseCommittee) : null,
        electricity_meter_number: data.electricityMeterNumber || null,
        electricity_account_number: data.electricityAccountNumber || null,
        water_meter_number: data.waterMeterNumber || null,
        water_account_number: data.waterAccountNumber || null,
        number_of_rooms: data.numberOfRooms ? Number(data.numberOfRooms) : null,
        parking_numbers: data.parkingNumbersStr
          ? data.parkingNumbersStr.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        image_url: imageUrl,
        basic_contract_url: basicContractUrl,
        land_registry_url: landRegistryUrl,
      };

      if (isEditing && propertyId) {
        await updateMutation.mutateAsync(payload);
        // Audit: for a scan attach, record which prefilled fields the user changed on the property.
        if (isScanEdit && logId && provenance) {
          updateExtractionLog(logId, {
            entity_type: 'property',
            created_id: propertyId,
            ...diffProvenance(provenance, data as Record<string, unknown>),
          });
        }
        showToast(t('property.updateSuccess'), 'success');
        // Scan flow: the lease's renters are still to be verified — continue straight into the
        // renter form(s) on the (existing) property instead of just closing.
        if (renterQueue && renterQueue.length > 0) {
          onClose();
          setCreatedPropertyId(propertyId);
          setRenterDrawerOpen(true);
        } else {
          onClose();
        }
      } else {
        const created = await createMutation.mutateAsync(payload);
        // Audit: record which prefilled fields the user changed on this property (scan flow only).
        if (logId && provenance) {
          updateExtractionLog(logId, {
            entity_type: 'property',
            created_id: created.id,
            ...diffProvenance(provenance, data as Record<string, unknown>),
          });
        }
        // Start clean for the next "Add property" — the drawer stays mounted, so without
        // this the previous values would persist.
        reset(EMPTY_FORM);
        setImageFile(null);
        setImagePresetUrl(null);
        setImageDirty(false);
        setBasicContractFile(null);
        setLandRegistryFile(null);
        setImagePreview(null);
        showToast(t('property.createSuccess'), 'success');
        setCreatedPropertyId(created.id);
        if (logId) {
          // Scan flow: the renter was already extracted — continue straight into the renter
          // form instead of interrupting with the "add a renter?" prompt.
          onClose();
          setRenterDrawerOpen(true);
        } else {
          // Manual add: ask whether to add a renter (over the still-open drawer).
          setShowRenterPrompt(true);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PropertyFormDrawer] save failed:', err);
      showToast(t('error.saveFailed'), 'error');
    }
  });

  const propertyTypeOptions = PROPERTY_TYPES.map((pt) => ({
    value: pt,
    label: t(`property.type_${pt}` as never, pt),
  }));

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
          form="property-form"
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
      title={isEditing ? t('property.editTitle') : t('property.addTitle')}
      width={620}
      footer={footer}
    >
      {/* Step indicator */}
      <div ref={stepperAnchorRef} className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
        ))}
        <span className="ms-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{step}/2</span>
      </div>

      <FieldReviewProvider items={reviewItems}>
      <form id="property-form" onSubmit={onSubmit} autoComplete="off" className="flex flex-col gap-4">
        {step === 1 ? (
          <div key="step-1" className="flex flex-col gap-4">
            {propertyConflicts.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)' }}>
                <div>
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('documentScan.conflictsTitle')}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('documentScan.conflictsHint')}
                  </p>
                </div>
                {propertyConflicts.map((c) => (
                  <FieldConflictToggle
                    key={c.formKey}
                    label={t(c.labelKey)}
                    existing={c.existing}
                    scanned={c.scanned}
                    choice={conflictChoices[c.formKey] ?? 'keep'}
                    onChange={(mode) => {
                      setConflictChoices((prev) => ({ ...prev, [c.formKey]: mode }));
                      setValue(c.formKey as keyof FormData, (mode === 'update' ? c.scanned : c.existing) as never, { shouldDirty: true });
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <FormInput label={t('property.address')} required error={errors.address?.message} {...register('address')} />
              {!isEditing && addressEvidence && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('documentScan.addressEvidence', { snippet: addressEvidence })}
                </p>
              )}
            </div>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <FormSelect
                  label={t('property.type')}
                  required
                  value={field.value}
                  onValueChange={field.onChange}
                  options={propertyTypeOptions}
                  placeholder={t('property.selectType')}
                  error={errors.type?.message}
                  reviewName="type"
                />
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.floor')} type="number" error={errors.floor?.message} {...register('floor')} />
              <FormInput label={t('property.apartment')} error={errors.apartment?.message} {...register('apartment')} />
            </div>
            <FormInput label={t('property.city')} required error={errors.city?.message} {...register('city')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.block')} type="number" error={errors.block?.message} {...register('block')} />
              <FormInput label={t('property.plot')} type="number" error={errors.plot?.message} {...register('plot')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.zipCode')} error={errors.zipCode?.message} {...register('zipCode')} />
              <FormInput label={t('property.sqFt')} type="number" error={errors.sqFt?.message} {...register('sqFt')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.numberOfRooms')} type="number" step="0.5" error={errors.numberOfRooms?.message} {...register('numberOfRooms')} />
              <Controller
                control={control}
                name="parkingNumbersStr"
                render={({ field }) => (
                  <FormChipInput
                    label={t('property.parkingNumbers')}
                    placeholder={t('property.parkingNumbersPlaceholder')}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.parkingNumbersStr?.message}
                  />
                )}
              />
            </div>
            <PropertyImageField
              label={t('property.image')}
              previewSrc={imagePreview}
              selectedPresetKey={imagePresetUrl ? parseImageUrlKey(imagePresetUrl) : null}
              onUploadFile={handleImageUpload}
              onSelectPreset={handleSelectPreset}
              onRemove={handleRemoveImage}
            />
          </div>
        ) : (
          <div key="step-2" className="flex flex-col gap-4">
            <PropertyFormTourRequest />
            <div ref={ownerAnchorRef}>
              <FormCreatableSelect
                control={control}
                name="propertyOwner"
                label={t('property.owner')}
                options={ownerOptions}
                placeholder={t('property.ownerPlaceholder')}
                createLabel={t('property.ownerCreate')}
                createModalTitle={t('property.createOwnerTitle')}
                createModalPlaceholder={t('property.ownerNamePlaceholder')}
                error={errors.propertyOwner?.message}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('property.inventoryNotes')}</label>
              <textarea
                rows={4}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                {...register('inventoryNotes')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.propertyTax')} type="number" error={errors.propertyTax?.message} {...register('propertyTax')} />
              <FormInput label={t('property.houseCommittee')} type="number" error={errors.houseCommittee?.message} {...register('houseCommittee')} />
            </div>
            <FormInput label={t('property.electricityMeterNumber')} error={errors.electricityMeterNumber?.message} {...register('electricityMeterNumber')} />
            <FormInput label={t('property.electricityAccountNumber')} error={errors.electricityAccountNumber?.message} {...register('electricityAccountNumber')} />
            <FormInput label={t('property.waterMeterNumber')} error={errors.waterMeterNumber?.message} {...register('waterMeterNumber')} />
            <FormInput label={t('property.waterAccountNumber')} error={errors.waterAccountNumber?.message} {...register('waterAccountNumber')} />
            <Controller
              control={control}
              name="basicContractUrl"
              render={({ field }) => (
                <FormDocumentInput
                  label={t('documents.basicContract')}
                  existingUrl={field.value ?? null}
                  pendingFile={basicContractFile}
                  onChange={(f) => { setBasicContractFile(f); if (f) field.onChange(undefined); }}
                  onRemoveExisting={() => field.onChange(null)}
                />
              )}
            />
            <Controller
              control={control}
              name="landRegistryUrl"
              render={({ field }) => (
                <FormDocumentInput
                  label={t('documents.landRegistry')}
                  existingUrl={field.value ?? null}
                  pendingFile={landRegistryFile}
                  onChange={(f) => { setLandRegistryFile(f); if (f) field.onChange(undefined); }}
                  onRemoveExisting={() => field.onChange(null)}
                />
              )}
            />
          </div>
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
    <PropertyCreatedPrompt
      open={showRenterPrompt}
      onAddRenter={() => { setShowRenterPrompt(false); onClose(); setRenterDrawerOpen(true); }}
      onSkip={() => { setShowRenterPrompt(false); onClose(); }}
    />
    <RenterFormDrawer
      open={renterDrawerOpen}
      initialPropertyId={createdPropertyId ?? undefined}
      logId={logId}
      renterQueue={renterQueue}
      pendingContractFile={renterContractFile ?? null}
      onClose={() => { setRenterDrawerOpen(false); setCreatedPropertyId(null); }}
    />
    </>
  );
}
