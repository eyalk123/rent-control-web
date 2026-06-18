import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { propertyFormSchema, PROPERTY_TYPES } from '../validation/propertyValidation';
import { useCreateProperty, useUpdateProperty, useProperty, useProperties } from '../queries';
import { useAppAuth } from '@/core/auth/AuthContext';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormFileInput } from '@/shared/components/form/FormFileInput';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { FormChipInput } from '@/shared/components/form/FormChipInput';
import { FormCreatableSelect } from '@/shared/components/form/FormCreatableSelect';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import type { z } from 'zod';
import { uploadToFirebase } from '@/shared/utils/firebaseUpload';
import { getPropertyImageSrc } from '../utils/propertyImageSrc';

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
}

export function PropertyFormDrawer({ open, onClose, propertyId }: Props) {
  const { t } = useTranslation();
  const isEditing = !!propertyId;

  const { data: existing } = useProperty(propertyId ?? 0);
  const { data: allProperties = [] } = useProperties();
  const { user } = useAppAuth();
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty(propertyId ?? 0);

  const ownerOptions = useMemo(() =>
    Array.from(new Set(
      allProperties
        .map((p) => p.property_owner?.trim())
        .filter((o): o is string => !!o)
    )).sort(),
  [allProperties]);
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [showDiscard, setShowDiscard] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [basicContractFile, setBasicContractFile] = useState<File | null>(null);
  const [landRegistryFile, setLandRegistryFile] = useState<File | null>(null);

  const { register, handleSubmit, control, reset, trigger, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(propertyFormSchema) as never,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) { setStep(1); setShowDiscard(false); setImageFile(null); setBasicContractFile(null); setLandRegistryFile(null); }
  }, [open]);

  // Files live outside RHF, so isDirty alone misses them.
  const dirty = isDirty || !!imageFile || !!basicContractFile || !!landRegistryFile;
  const attemptClose = () => { if (dirty) setShowDiscard(true); else onClose(); };

  useEffect(() => {
    if (existing && open) {
      reset({
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
      });
      setImagePreview(getPropertyImageSrc(existing.image_url));
    } else if (!propertyId && open) {
      reset(EMPTY_FORM);
      setImagePreview(null);
    }
  }, [existing, open, propertyId, reset]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(getPropertyImageSrc(existing?.image_url));
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      let imageUrl: string | undefined;
      let basicContractUrl = data.basicContractUrl || undefined;
      let landRegistryUrl = data.landRegistryUrl || undefined;

      if (user) {
        if (imageFile) imageUrl = await uploadToFirebase(imageFile, 'properties', user.uid);
        if (basicContractFile) basicContractUrl = await uploadToFirebase(basicContractFile, 'properties', user.uid);
        if (landRegistryFile) landRegistryUrl = await uploadToFirebase(landRegistryFile, 'properties', user.uid);
      }

      const payload = {
        address: data.address,
        city: data.city,
        block: data.block || undefined,
        plot: data.plot || undefined,
        zip_code: data.zipCode || '',
        type: data.type,
        sq_ft: data.sqFt ? Number(data.sqFt) : 0,
        property_owner: data.propertyOwner || undefined,
        inventory_notes: data.inventoryNotes || undefined,
        floor: data.floor ? Number(data.floor) : undefined,
        apartment: data.apartment || undefined,
        property_tax: data.propertyTax ? Number(data.propertyTax) : undefined,
        house_committee: data.houseCommittee ? Number(data.houseCommittee) : undefined,
        electricity_meter_number: data.electricityMeterNumber || undefined,
        electricity_account_number: data.electricityAccountNumber || undefined,
        water_meter_number: data.waterMeterNumber || undefined,
        water_account_number: data.waterAccountNumber || undefined,
        number_of_rooms: data.numberOfRooms ? Number(data.numberOfRooms) : undefined,
        parking_numbers: data.parkingNumbersStr
          ? data.parkingNumbersStr.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        image_url: imageUrl,
        basic_contract_url: basicContractUrl,
        land_registry_url: landRegistryUrl,
      };

      if (isEditing && propertyId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
        // Start clean for the next "Add property" — the drawer stays mounted, so without
        // this the previous values would persist.
        reset(EMPTY_FORM);
        setImageFile(null);
        setBasicContractFile(null);
        setLandRegistryFile(null);
        setImagePreview(null);
      }

      showToast(t(isEditing ? 'property.updateSuccess' : 'property.createSuccess'), 'success');
      onClose();
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
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
        ))}
        <span className="ms-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{step}/2</span>
      </div>

      <form id="property-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {step === 1 ? (
          <div key="step-1" className="flex flex-col gap-4">
            <FormInput label={t('property.address')} required error={errors.address?.message} {...register('address')} />
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
                />
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label={t('property.numberOfRooms')} type="number" error={errors.numberOfRooms?.message} {...register('numberOfRooms')} />
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
            <FormFileInput
              label={t('property.image')}
              accept="image/*"
              value={imageFile}
              onChange={handleImageChange}
              preview={imagePreview}
            />
          </div>
        ) : (
          <div key="step-2" className="flex flex-col gap-4">
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
