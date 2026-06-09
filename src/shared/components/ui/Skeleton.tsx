interface Props {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Shimmer placeholder used while data loads, so numbers/text don't flash
 * misleading defaults (e.g. $0.00, 0%). Reuses the `.skeleton` class in index.css.
 */
export function Skeleton({ className, width, height }: Props) {
  return <span className={`skeleton inline-block align-middle ${className ?? ''}`} style={{ width, height }} />;
}
