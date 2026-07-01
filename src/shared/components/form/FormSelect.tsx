import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RequiredMark } from './RequiredMark';
import { FieldReviewNotice, useDismissFieldReview, useFieldReview } from './FieldReviewContext';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  label?: string;
  error?: string;
  value?: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** RHF field name, set only when this select should participate in document-scan review. */
  reviewName?: string;
}

export function FormSelect<T extends string>({
  label, error, value, onValueChange, options, placeholder, disabled, required, reviewName,
}: Props<T>) {
  const { t, i18n } = useTranslation();
  const review = useFieldReview(reviewName);
  const dismissReview = useDismissFieldReview();
  const flagged = !!review && !error;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">{label}{required && <RequiredMark />}</label>}
      {/* Ignore spurious empty emissions: Radix fires onValueChange('') for one render when
          a programmatically-set (e.g. RHF reset) value transitions before its Item registers,
          which would wipe the selection. No Item uses '', so a real change is always truthy. */}
      <Select.Root value={value} onValueChange={(v) => { if (v) { onValueChange(v as T); if (reviewName) dismissReview?.(reviewName); } }} disabled={disabled} dir={i18n.dir()}>
        <Select.Trigger id={reviewName ? `scan-field-${reviewName}` : undefined} aria-required={required || undefined} className={`flex items-center justify-between w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'} ${!value ? 'text-[var(--color-placeholder)]' : 'text-[var(--color-text-primary)]'}`}>
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-50 min-w-[8rem] overflow-hidden rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline)] shadow-lg">
            <Select.Viewport className="p-1">
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] cursor-pointer outline-none hover:bg-[var(--color-outline)] data-[highlighted]:bg-[var(--color-outline)]"
                >
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} className="text-[var(--color-primary)]" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
      {flagged && <FieldReviewNotice source={review!.source} />}
    </div>
  );
}
