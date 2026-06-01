import { Building2 } from 'lucide-react';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getPropertyImageSrc } from '@/features/properties/utils/propertyImageSrc';

interface PropTileProps {
  propertyId: number;
  imageUrl?: string | null;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function PropTile({ propertyId, imageUrl, size = 56, width, height, className = '' }: PropTileProps) {
  const color = getPropertyColor(propertyId);
  const bg = getPropertyColorBg(propertyId, 0.15);
  const w = width ?? size;
  const h = height ?? size;
  const iconSize = Math.round(Math.min(w, h) * 0.45);
  const imageSrc = getPropertyImageSrc(imageUrl);

  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-[var(--radius-lg)] overflow-hidden ${className}`}
      style={{ width: w, height: h, background: bg }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
      ) : (
        <Building2 size={iconSize} style={{ color }} strokeWidth={1.5} />
      )}
    </div>
  );
}
