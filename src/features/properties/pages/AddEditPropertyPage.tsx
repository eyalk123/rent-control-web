import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { propertyFormSchema, PROPERTY_TYPES } from '../validation/propertyValidation';
import { useCreatePropertyWithImage, useUpdateProperty, useProperty } from '../queries';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { FormFileInput } from '@/shared/components/form/FormFileInput';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';
import type { z } from 'zod';
import { uploadPropertyImage } from '../api/properties';

type FormData = z.infer<typeof propertyFormSchema>;

export function AddEditPropertyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const isEditing = !!params.id;
  const id = params.id ? Number(params.id) : undefined;

  const { data: existing } = useProperty(id ?? 0);
  const createMutation = useCreatePropertyWithImage();
  const updateMutation = useUpdateProperty(id ?? 0);
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(propertyFormSchema) });

  useEffect(() => {
    if (existing) {
      reset({
        address: existing.address,
        city: existing.city,
        zipCode: existing.zip_code ?? '',
        type: existing.type,
        sqFt: existing.sq_ft?.toString() ?? '',
        propertyOwner: existing.property_owner ?? '',
        inventoryNotes: existing.inventory_notes ?? '',
        floor: existing.floor?.toString() ?? '',
        apartment: existing.apartment ?? '',
      });
      if (existing.image_url) setImagePreview(existing.image_url);
    }
  }, [existing, reset]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(existing?.image_url ?? null);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        address: data.address,
        city: data.city,
        zip_code: data.zipCode || '',
        type: data.type ?? 'apartment',
        sq_ft: data.sqFt ? Number(data.sqFt) : 0,
        property_owner: data.propertyOwner || undefined,
        inventory_notes: data.inventoryNotes || undefined,
        floor: data.floor ? Number(data.floor) : undefined,
        apartment: data.apartment || undefined,
      };

      if (isEditing && id) {
        await updateMutation.mutateAsync(payload);
        if (imageFile) {
          const fd = new FormData();
          fd.append('file', imageFile);
          await uploadPropertyImage(id, fd);
        }
      } else {
        await createMutation.mutateAsync({ data: payload, imageFile });
      }

      showToast(t(isEditing ? 'property.updateSuccess' : 'property.createSuccess'), 'success');
      navigate('/properties');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  });

  const propertyTypeOptions = PROPERTY_TYPES.map((pt) => ({
    value: pt,
    label: t(`property.type_${pt}` as never, pt),
  }));

  return (
    <PageContainer>
      {/* Back button */}
      <button
        onClick={() => step === 2 ? setStep(1) : navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
      >
        <ChevronLeft size={16} />
        {step === 2 ? t('common.back') : t('common.cancel')}
      </button>

      <h1 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
        {isEditing ? t('property.editTitle') : t('property.addTitle')}
      </h1>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
        ))}
        <span className="ms-1 text-xs text-[var(--color-text-secondary)]">{step}/2</span>
      </div>

      <form onSubmit={onSubmit}>
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 flex flex-col gap-4 max-w-2xl">
          {step === 1 ? (
            <>
              <FormInput label={t('property.address')} error={errors.address?.message} {...register('address')} />
              <FormInput label={t('property.city')} error={errors.city?.message} {...register('city')} />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label={t('property.zipCode')} error={errors.zipCode?.message} {...register('zipCode')} />
                <FormInput label={t('property.sqFt')} type="number" error={errors.sqFt?.message} {...register('sqFt')} />
              </div>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <FormSelect
                    label={t('property.type')}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={propertyTypeOptions}
                    placeholder={t('property.selectType')}
                    error={errors.type?.message}
                  />
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label={t('property.floor')} type="number" error={errors.floor?.message} {...register('floor')} />
                <FormInput label={t('property.apartment')} error={errors.apartment?.message} {...register('apartment')} />
              </div>
              <FormFileInput
                label={t('property.image')}
                accept="image/*"
                value={imageFile}
                onChange={handleImageChange}
                preview={imagePreview}
              />
            </>
          ) : (
            <>
              <FormInput label={t('property.owner')} error={errors.propertyOwner?.message} {...register('propertyOwner')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">{t('property.inventoryNotes')}</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-primary)] resize-none"
                  {...register('inventoryNotes')}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex gap-3 max-w-2xl">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? '...' : t('common.save')}
            </button>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
