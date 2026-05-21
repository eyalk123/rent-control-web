import type { ReactNode } from 'react';

type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'navy' | 'revenue' | 'expense';
type PillSize = 'sm' | 'md';

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  size?: PillSize;
  className?: string;
}

const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-[var(--color-outline)] text-[var(--color-text-primary)]',
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  danger:  'bg-[var(--color-error)]/15 text-[var(--color-error)]',
  info:    'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]',
  navy:    'bg-[var(--color-brand-navy)] text-white',
  revenue: 'bg-[var(--color-rev-bg)] text-[var(--color-rev-fg)]',
  expense: 'bg-[var(--color-exp-bg)] text-[var(--color-exp-fg)]',
};

const sizeClasses: Record<PillSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] font-medium leading-4',
  md: 'px-2.5 py-1 text-xs font-medium leading-4',
};

export function Pill({ children, tone = 'neutral', size = 'sm', className = '' }: PillProps) {
  return (
    <span className={`inline-flex items-center rounded-full whitespace-nowrap ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
