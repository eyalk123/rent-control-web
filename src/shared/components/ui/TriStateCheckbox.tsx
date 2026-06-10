import type { ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';

interface Props {
  checked: boolean;
  indeterminate?: boolean;
  /** Optional custom glyph; defaults to a check / minus based on state. */
  children?: ReactNode;
}

/**
 * A square checkbox box rendered to match the app's theme tokens. Filled with
 * the primary color when checked or indeterminate. Purely presentational — the
 * caller owns the click handler.
 */
export function TriStateCheckbox({ checked, indeterminate = false, children }: Props) {
  const active = checked || indeterminate;
  const glyph = children ?? (checked ? <Check size={13} /> : indeterminate ? <Minus size={13} /> : null);

  return (
    <span
      aria-hidden
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] transition-colors"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-outline)'}`,
        color: '#fff',
      }}
    >
      {glyph}
    </span>
  );
}
