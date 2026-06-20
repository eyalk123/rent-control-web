import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Short unit shown next to the value, e.g. "yrs". */
  unitLabel?: string;
}

/** Compact − value + counter. Logical-property classes keep it correct in RTL. */
export function Stepper({ label, value, onChange, min = 0, max = 99, unitLabel }: StepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
      )}
      <div
        className="inline-flex items-center self-start rounded-xl border bg-[var(--color-input-bg)] overflow-hidden"
        style={{ borderColor: 'var(--color-input-border)' }}
      >
        <button
          type="button"
          aria-label="decrease"
          onClick={() => onChange(clamp(value - 1))}
          disabled={atMin}
          className="grid place-items-center w-11 h-11 transition-colors enabled:hover:bg-[var(--color-outline)] disabled:opacity-40"
          style={{ color: 'var(--color-primary)' }}
        >
          <Minus size={18} />
        </button>
        <div className="flex flex-col items-center justify-center min-w-14 px-2 select-none">
          <span className="text-lg font-bold text-[var(--color-text-primary)] leading-none">{value}</span>
          {unitLabel && (
            <span className="text-[10px] mt-0.5 text-[var(--color-text-secondary)]">{unitLabel}</span>
          )}
        </div>
        <button
          type="button"
          aria-label="increase"
          onClick={() => onChange(clamp(value + 1))}
          disabled={atMax}
          className="grid place-items-center w-11 h-11 transition-colors enabled:hover:bg-[var(--color-outline)] disabled:opacity-40"
          style={{ color: 'var(--color-primary)' }}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
