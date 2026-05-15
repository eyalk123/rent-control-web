import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

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
}

export function FormSelect<T extends string>({
  label, error, value, onValueChange, options, placeholder, disabled,
}: Props<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}
      <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <Select.Trigger className={`flex items-center justify-between w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'} ${!value ? 'text-[var(--color-placeholder)]' : 'text-[var(--color-text-primary)]'}`}>
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
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
