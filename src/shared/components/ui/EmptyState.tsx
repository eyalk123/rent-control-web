import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-outline)]">
          <Icon size={24} className="text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
