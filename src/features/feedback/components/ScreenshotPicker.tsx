import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { imageToBase64, type EncodedImage } from '@/shared/utils/imageToBase64';
import { MAX_SCREENSHOTS } from '../validation/feedbackValidation';

interface Props {
  value: EncodedImage[];
  onChange: (next: EncodedImage[]) => void;
  disabled?: boolean;
}

/**
 * Up to three screenshots, by file picker or by paste.
 *
 * Paste is listened for on the document rather than on an input, because the
 * gesture people actually make is Ctrl+V straight after PrtScn without clicking
 * anything first — a screenshot on the desktop clipboard never becomes a file on
 * disk unless the app makes them save it.
 */
export function ScreenshotPicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_SCREENSHOTS;

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return;

      const room = MAX_SCREENSHOTS - value.length;
      if (room <= 0) {
        setError('feedback.screenshotsFull');
        return;
      }

      try {
        const encoded = await Promise.all(images.slice(0, room).map(imageToBase64));
        setError(null);
        onChange([...value, ...encoded]);
      } catch {
        setError('feedback.screenshotFailed');
      }
    },
    [onChange, value],
  );

  useEffect(() => {
    if (disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith('image/'))) {
        // Only claim the event when there is actually an image on the clipboard,
        // so pasting text into the message box still behaves normally.
        event.preventDefault();
        void addFiles(files);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [addFiles, disabled]);

  const remove = (index: number) => {
    setError(null);
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((shot, index) => (
          <div
            key={`${shot.filename}-${index}`}
            className="relative rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-outline)', width: 88, height: 88 }}
          >
            <img
              src={`data:${shot.contentType};base64,${shot.data}`}
              alt={shot.filename}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={t('feedback.removeScreenshot')}
              className="absolute top-1 end-1 rounded-full p-1 leading-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] disabled:opacity-60"
            style={{
              width: 88,
              height: 88,
              border: '1px dashed var(--color-input-border)',
              background: 'var(--color-input-bg)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ImagePlus size={18} />
            {t('feedback.addScreenshot')}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          // Let the same file be chosen again after a removal.
          e.target.value = '';
        }}
      />

      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {t('feedback.screenshotHint', { max: MAX_SCREENSHOTS })}
      </p>
      {/* They are about to send us their renters' names, addresses and rent
          amounts. Saying so is the least we can do. */}
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {t('feedback.screenshotPrivacy')}
      </p>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }}>
          {t(error)}
        </p>
      )}
    </div>
  );
}
