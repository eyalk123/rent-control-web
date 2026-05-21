import { getPropertyColor } from '@/shared/utils/propertyColor';

type StatusDot = 'active' | 'expiring' | 'overdue' | 'none';

interface AvatarWithDotProps {
  name: string;
  id: number;
  size?: number;
  status?: StatusDot;
}

const dotColors: Record<StatusDot, string> = {
  active:   'var(--color-success)',
  expiring: 'var(--color-warning)',
  overdue:  'var(--color-error)',
  none:     'transparent',
};

export function AvatarWithDot({ name, id, size = 48, status = 'none' }: AvatarWithDotProps) {
  const color = getPropertyColor(id);
  const bg = color + '22';
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const dotSize = Math.round(size * 0.25);
  const fontSize = Math.round(size * 0.35);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full w-full h-full font-semibold"
        style={{ background: bg, color, fontSize }}
      >
        {initials}
      </div>
      {status !== 'none' && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--color-surface)]"
          style={{ width: dotSize, height: dotSize, background: dotColors[status] }}
        />
      )}
    </div>
  );
}
