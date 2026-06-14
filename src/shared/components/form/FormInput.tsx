import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { RequiredMark } from './RequiredMark';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, required, className = '', id, ...rest }, ref) => {
    const { t } = useTranslation();
    const inputId = id ?? `fi-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
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
            error
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-input-border)]'
          } ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
