import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, X } from 'lucide-react';

interface Props {
  label?: string;
  error?: string;
  accept?: string;
  /** Existing URL (from DB) shown as a link */
  existingUrl?: string | null;
  /** Pending file chosen but not yet uploaded */
  pendingFile?: File | null;
  onChange: (file: File | null) => void;
  onRemoveExisting?: () => void;
}

export function FormDocumentInput({
  label,
  error,
  accept = '.pdf,.doc,.docx',
  existingUrl,
  pendingFile,
  onChange,
  onRemoveExisting,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const fileName = pendingFile?.name ?? (existingUrl ? decodeURIComponent(existingUrl.split('/').pop()?.split('?')[0] ?? '') : null);
  const hasFile = !!(pendingFile || existingUrl);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}

      {hasFile ? (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border"
          style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-input-border)' }}
        >
          <FileText size={16} className="shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
          {existingUrl && !pendingFile ? (
            <a
              href={existingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm truncate hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              {fileName || t('documents.upload')}
            </a>
          ) : (
            <span className="flex-1 text-sm truncate text-[var(--color-text-primary)]">
              {fileName || t('documents.upload')}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (pendingFile) {
                onChange(null);
              } else {
                onRemoveExisting?.();
              }
            }}
            aria-label={t('a11y.remove')}
            className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 ${
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'
          }`}
        >
          <Upload size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
          <span className="text-sm text-[var(--color-text-secondary)]">{t('documents.upload')}</span>
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
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
    </div>
  );
}
