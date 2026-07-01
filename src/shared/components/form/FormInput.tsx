import { forwardRef } from 'react';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { RequiredMark } from './RequiredMark';
import { FieldReviewNotice, useDismissFieldReview, useFieldReview } from './FieldReviewContext';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, required, className = '', id, ...rest }, ref) => {
    const { t } = useTranslation();
    const fieldName = typeof rest.name === 'string' ? rest.name : undefined;
    const review = useFieldReview(fieldName);
    const dismissReview = useDismissFieldReview();
    // Don't double-decorate when the field is also in an error state.
    const flagged = !!review && !error;
    const inputId = id ?? `fi-${label?.replace(/\s+/g, '-').toLowerCase()}`;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      rest.onChange?.(e);
      if (review && fieldName) dismissReview?.(fieldName);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {label}
            {required && <RequiredMark />}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-required={required || undefined}
          dir={(rest.type === 'number' || rest.type === 'tel') ? 'ltr' : undefined}
          className={`w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none transition-colors focus:border-[var(--color-primary)] ${
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'
          } ${className}`}
          {...rest}
          onChange={handleChange}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}
        {flagged && <FieldReviewNotice source={review!.source} />}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
