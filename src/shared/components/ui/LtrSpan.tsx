import type { CSSProperties } from 'react';

/** Wraps content in a LTR span — use around currency amounts in RTL (Hebrew) mode */
export function LtrSpan({ children, className, style }: { children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span dir="ltr" className={`inline-block ${className ?? ''}`} style={style}>
      {children}
    </span>
  );
}
