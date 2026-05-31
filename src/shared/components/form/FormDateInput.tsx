import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const FormDateInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const { t } = useTranslation();
    const inputId = id ?? `fd-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          className={`w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] ${
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'
          } ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
      </div>
    );
  },
);
FormDateInput.displayName = 'FormDateInput';
