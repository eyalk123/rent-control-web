interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  'aria-label'?: string;
}

/**
 * The per-year editable rent amount input, shared by the renter form (LeaseTermBuilder's
 * custom mode) and the lease-extension drawer. A plain LTR number field styled to match the
 * lease-year rows; the renter form drives it through an RHF Controller, the extension drawer
 * through useState.
 */
export function LeaseYearAmountField({ value, onChange, onBlur, name, placeholder, ...rest }: Props) {
  return (
    <input
      type="number"
      dir="ltr"
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={rest['aria-label']}
      className="flex-1 min-w-0 rounded-lg border bg-[var(--color-input-bg)] px-2.5 h-9 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)]"
      style={{ borderColor: 'var(--color-input-border)' }}
    />
  );
}
