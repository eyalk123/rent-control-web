/**
 * Shading for the on-screen report, mirroring the exported PDF.
 *
 * The PDF's equivalents are `GRID_LIGHT` / `GRID_STRONG` / `NET_ROW_FILL` / `TOTAL_COL_FILL`
 * in `rent-control-backend/app/services/report_service.py`. It uses fixed greys because a PDF
 * has no dark mode; here the same *relationships* are expressed in theme tokens so the preview
 * holds up in both themes:
 *
 *   - the grid inside a property block is faint, so the three rows read as one unit
 *   - the rule between blocks is not, so properties separate cleanly
 *   - the Total column carries a tint, because it is the number most people came for
 *
 * Keep the two in step: if the emphasis changes in one, change it in the other.
 */
export const reportTheme = {
  gridLight: 'color-mix(in srgb, var(--color-outline) 55%, transparent)',
  gridStrong: 'var(--color-outline)',
  netRowBg: 'var(--color-input-filled-background)',
  totalColBg: 'color-mix(in srgb, var(--color-text-secondary) 7%, transparent)',
  totalColBgNet: 'color-mix(in srgb, var(--color-text-secondary) 13%, transparent)',
} as const;

/**
 * Column widths, shared by the header row and every data row so they line up.
 *
 * The property column is a fixed width and the month columns take the slack — the other way
 * round, the address soaked up every spare pixel on a wide screen and squeezed the months.
 * Horizontal padding belongs *inside* these cells, never on the row: padding on the header row
 * alone shifts every label out of line with the figures under it.
 */
export const reportCols = {
  property: 'w-64 shrink-0',
  metric: 'w-[70px] shrink-0',
  month: 'flex-1 min-w-[58px] text-end',
  total: 'w-28 shrink-0 text-end',
} as const;

/** Faint rule between month columns, so a figure is easy to trace up to its month. */
export const monthDivider = (theme: 'header' | 'body') => ({
  borderInlineStart:
    theme === 'header' ? '1px solid rgba(255,255,255,0.18)' : `1px solid ${reportTheme.gridLight}`,
});
