const PROPERTY_COLORS = [
  '#2563EB', // blue
  '#0D9488', // teal
  '#7C3AED', // violet
  '#DB2777', // pink
  '#D97706', // amber
  '#16A34A', // green
  '#DC2626', // red
  '#0891B2', // cyan
];

export function getPropertyColor(id: number): string {
  return PROPERTY_COLORS[Math.abs(id) % PROPERTY_COLORS.length];
}

export function getPropertyColorBg(id: number, alpha = 0.12): string {
  const hex = getPropertyColor(id);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * The large no-photo block on a property card. Its strength is a theme token
 * (`--property-placeholder-tint`) rather than a fixed alpha: at the light theme's 35%, a
 * saturated hue over the dark surface turned into a dull teal / plum / brown slab that was
 * the loudest colour on the page.
 */
export function getPropertyPlaceholderBg(id: number): string {
  return `color-mix(in srgb, ${getPropertyColor(id)} var(--property-placeholder-tint), transparent)`;
}
