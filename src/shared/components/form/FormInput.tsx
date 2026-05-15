import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id ?? `fi-${label?.replace(/\s+/g, '-').toLowerCase()}`;
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
          className={`w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none transition-colors focus:border-[var(--color-primary)] ${
            error
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-input-border)]'
          } ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
