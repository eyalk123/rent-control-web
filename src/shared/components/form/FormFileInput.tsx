import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  label?: string;
  error?: string;
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  preview?: string | null;
}

export function FormFileInput({ label, error, accept, value, onChange, preview }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}

      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="preview" className="h-48 w-full rounded-xl object-contain border border-[var(--color-outline)] bg-white" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error)] text-white"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 ${
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'
          }`}
        >
          <Upload size={20} className="text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {value ? value.name : t('common.clickToUpload')}
          </span>
        </button>
      )}

      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
        }}
      />
      {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
    </div>
  );
}
