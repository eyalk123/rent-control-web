/** Red asterisk marking a required form field. Decorative — fields also set aria-required. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ms-0.5 text-[var(--color-error)]">
      *
    </span>
  );
}
