/**
 * A small on/off switch.
 *
 * `role="switch"` rather than a checkbox: screen readers announce "on"/"off" for it,
 * which is what this control means, and it needs no visible label of its own — the row
 * it sits in provides that, passed here as `label`.
 *
 * Positioned with `insetInlineStart` so the knob travels the right way in Hebrew.
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-10 rounded-full transition-colors shrink-0"
      style={{ background: checked ? 'var(--color-primary)' : 'var(--color-outline)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: checked ? '1.125rem' : '0.125rem' }}
      />
    </button>
  );
}
