import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ImagePlus, Upload, X } from 'lucide-react';
import { HOUSE_IMAGE_PRESETS, housePresetSrc, toImageUrlKey } from '../constants/houseImagePresets';

interface Props {
  label?: string;
  /** Resolved image URL to preview (custom object URL, remote URL, or a preset src), or null. */
  previewSrc: string | null;
  /** Key of the currently-selected preset (for the check badge), or null. */
  selectedPresetKey: string | null;
  onUploadFile: (file: File) => void;
  /** Called with the `rc-house:<key>` sentinel when a preset is chosen. */
  onSelectPreset: (imageUrlValue: string) => void;
  onRemove: () => void;
}

export function PropertyImageField({
  label,
  previewSrc,
  selectedPresetKey,
  onUploadFile,
  onSelectPreset,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    onUploadFile(file);
    setPickerOpen(false);
  };

  const handlePreset = (key: string) => {
    onSelectPreset(toImageUrlKey(key));
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}

      {previewSrc ? (
        <div className="flex flex-col gap-2">
          <div className="relative inline-block">
            <img
              src={previewSrc}
              alt="preview"
              className="h-48 w-full rounded-xl object-contain border border-[var(--color-outline)] bg-white"
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={t('property.removePhoto')}
              className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error)] text-white"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="self-start h-9 px-3 rounded-[9px] text-[13px] font-medium"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          >
            {t('property.changeImage')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-input-border)] py-8 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
        >
          <Upload size={20} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('property.addAPhoto')}</span>
          <span className="text-xs text-[var(--color-text-secondary)]">{t('property.photoHelper')}</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {pickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPickerOpen(false)} aria-hidden />
          <div
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg mx-4 flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('property.choosePresetImage')}
              </h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label={t('common.cancel')}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="px-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 h-10 rounded-[9px] text-[13px] font-medium"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
              >
                <ImagePlus size={16} aria-hidden="true" />
                {t('documents.uploadFromGallery')}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-5">
              {HOUSE_IMAGE_PRESETS.map((preset) => {
                const isSelected = preset.key === selectedPresetKey;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePreset(preset.key)}
                    className="relative flex flex-col overflow-hidden rounded-[10px]"
                    style={{ border: `3px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}` }}
                  >
                    <img
                      src={housePresetSrc(preset.filename)}
                      alt={preset.label}
                      className="aspect-square w-full object-cover"
                    />
                    <span
                      className="truncate px-1 py-1 text-center text-[10px]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {preset.label}
                    </span>
                    {isSelected && (
                      <span
                        className="absolute top-1 end-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
