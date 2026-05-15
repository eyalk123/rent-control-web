import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
}

export function StatBox({ label, value, icon: Icon, color }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-outline)] p-4">
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: color ? `${color}20` : 'var(--color-outline)' }}>
          <Icon size={16} style={{ color: color ?? 'var(--color-text-secondary)' }} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-2xl font-bold text-[var(--color-text-primary)]" dir="ltr">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
