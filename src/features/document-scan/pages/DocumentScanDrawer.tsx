import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { getApiErrorMessage } from '@/core/api/client';
import { useExtractLease } from '../queries';
import { mapExtraction, type MappedExtraction } from '../utils/mapExtraction';
import { mergeImagesToPdf } from '../utils/mergeImagesToPdf';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once extraction succeeds. The parent opens its persistent property form
   *  (pre-filled), which chains into the renter form. The file passed is the document that
   *  was actually sent (a merged PDF when multiple pages were captured). */
  onExtracted: (logId: number, mapped: MappedExtraction, file: File) => void;
}

const ACCEPT = 'image/*,application/pdf,.pdf,.docx';
const isImage = (f: File) => f.type.startsWith('image/');

/** Multiple images are allowed (they merge into one PDF); a PDF/DOCX must stand alone. */
function validate(files: File[]): string | null {
  if (files.length <= 1) return null;
  if (files.some((f) => !isImage(f))) return 'documentScan.mixedFilesError';
  return null;
}

/** Cycle through progress messages while the (slow) extraction runs. */
function useStagedProgress(active: boolean, merging: boolean): string {
  const stages = useMemo(
    () => [
      ...(merging ? ['documentScan.progress.merging'] : []),
      'documentScan.progress.uploading',
      'documentScan.progress.reading',
      'documentScan.progress.extracting',
    ],
    [merging],
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) {
      setI(0);
      return;
    }
    const id = setInterval(() => setI((p) => Math.min(p + 1, stages.length - 1)), 3500);
    return () => clearInterval(id);
  }, [active, stages.length]);
  return stages[Math.min(i, stages.length - 1)];
}

/** Scan-a-document entry: pick/confirm one or more files, then press Extract to run the
 *  backend extraction. Multiple images are merged into a single PDF first; the resulting file
 *  is handed to the parent (and later stored as the renter's contract). */
export function DocumentScanDrawer({ open, onClose, onExtracted }: Props) {
  const { t } = useTranslation();
  const extract = useExtractLease();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processing = extract.isPending || merging;
  const stage = useStagedProgress(processing, merging);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setError(null);
      setMerging(false);
      extract.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the drawer closes
  }, [open]);

  const validationError = validate(files);
  const allImages = files.length > 0 && files.every(isImage);
  const canExtract = files.length > 0 && !validationError && !processing;

  const addFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const next = [...files, ...Array.from(picked)];
    const err = validate(next);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFiles(next);
  };

  const removeFile = (index: number) => {
    setError(null);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (!canExtract) return;
    setError(null);
    try {
      let file = files[0];
      if (files.length > 1 && allImages) {
        setMerging(true);
        try {
          file = await mergeImagesToPdf(files);
        } finally {
          setMerging(false);
        }
      }
      const { logId, extraction } = await extract.mutateAsync(file);
      onExtracted(logId, mapExtraction(extraction), file);
    } catch (err) {
      setError(getApiErrorMessage(err, t('error.extractionFailed')));
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={handleExtract}
        disabled={!canExtract}
        className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {t('documentScan.extractAction')}
      </button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={t('documentScan.title')} width={520} footer={footer}>
      <div className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('documentScan.uploadPrompt')}
        </p>

        {processing ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t(stage)}</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
              style={{ borderColor: 'var(--color-input-border)' }}
            >
              <Upload size={20} style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {files.length > 0 ? t('documentScan.addPage') : t('common.clickToUpload')}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
                  >
                    <FileText size={16} className="shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Check size={15} className="shrink-0" style={{ color: 'var(--color-success, #16a34a)' }} aria-hidden="true" />
                    <button type="button" onClick={() => removeFile(i)} aria-label={t('documentScan.removePage')}>
                      <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {allImages && files.length > 1 && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('documentScan.selectedPages', { count: files.length })}
              </p>
            )}
          </>
        )}

        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{t(error, { defaultValue: error })}</p>}
      </div>
    </Drawer>
  );
}
