import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Skeleton } from '@/shared/components/ui/Skeleton';

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: 'success' | 'danger' | 'warning';
  /** When true, render a shimmer placeholder instead of the (still-loading) value. */
  loading?: boolean;
}

export function HeroStat({ label, value, sub, tone, loading }: Props) {
  const color =
    tone === 'success' ? 'var(--color-success)' :
    tone === 'danger'  ? 'var(--color-error)'   :
    tone === 'warning' ? 'var(--color-warning)'  :
    'var(--color-text-primary)';
  return (
    <div className="px-5 py-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5" width="70%" height={20} />
      ) : (
        <>
          <LtrSpan className="text-[22px] font-bold mt-1 block truncate" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</LtrSpan>
          {sub && <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>}
        </>
      )}
    </div>
  );
}
