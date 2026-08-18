interface Props {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  label: string;
}

/**
 * Year selector for the payment grid. Only years that have actually begun are listed —
 * `listPayableYears` caps at the current year, because rent that cannot be owed yet
 * cannot be paid yet.
 */
export function YearChips({ years, value, onChange, label }: Props) {
  if (years.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {years.map((year) => {
        const active = year === value;
        return (
          <button
            key={year}
            type="button"
            onClick={() => onChange(year)}
            aria-pressed={active}
            dir="ltr"
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background: active ? 'var(--color-primary)' : 'var(--color-input-filled-background)',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-outline)'}`,
            }}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
