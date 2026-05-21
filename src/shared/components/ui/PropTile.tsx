import { Building2 } from 'lucide-react';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';

interface PropTileProps {
  propertyId: number;
  size?: number;
  className?: string;
}

export function PropTile({ propertyId, size = 56, className = '' }: PropTileProps) {
  const color = getPropertyColor(propertyId);
  const bg = getPropertyColorBg(propertyId, 0.15);
  const iconSize = Math.round(size * 0.45);

  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-[var(--radius-lg)] ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      <Building2 size={iconSize} style={{ color }} strokeWidth={1.5} />
    </div>
  );
}
