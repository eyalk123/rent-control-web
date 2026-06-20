interface SegToggleOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegToggleProps<T extends string> {
  options: SegToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegToggle<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegToggleProps<T>) {
  const padClass = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';

  return (
    <div className={`inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-input-filled-background)] p-0.5 gap-0.5 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-[9px] font-medium transition-colors ${padClass} ${
              active
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold leading-none ${
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-outline)] text-[var(--color-text-secondary)]'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
