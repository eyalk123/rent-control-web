/**
 * Display helpers for `Property.returns`. The figures themselves are computed by the backend
 * and never here: one calculation, so this screen and the assistant cannot disagree.
 */

/**
 * "4.2%", or "+4.2%" with `signed`. Wrapped in directional isolates so a Hebrew line does not
 * move the sign or the percent to the other end of the number.
 */
export function formatPercent(ratio: number, signed = false): string {
  const pct = (ratio * 100).toFixed(1);
  const text = signed && ratio > 0 ? `+${pct}%` : `${pct}%`;
  return `\u2066${text}\u2069`;
}

/** Rent ÷ mortgage as a whole percentage — "131%" — isolated like `formatPercent`. */
export function formatCoverage(ratio: number): string {
  return `\u2066${Math.round(ratio * 100)}%\u2069`;
}
