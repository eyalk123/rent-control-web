import { useTranslation } from 'react-i18next';

/** A single "keep existing / use lease" chooser for one field where the scanned lease disagrees
 *  with a stored record. Shared by the property conflicts on the scan summary and the renter
 *  conflicts inside the renter form so both look and behave identically. */
export function FieldConflictToggle({
  label,
  existing,
  scanned,
  choice,
  onChange,
}: {
  /** Already-translated field label (e.g. "Phone"). */
  label: string;
  existing: string;
  scanned: string;
  choice: 'keep' | 'update';
  onChange: (mode: 'keep' | 'update') => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </span>
      <div className="flex gap-2">
        {(
          [
            ['keep', t('documentScan.fieldKeepExisting', { value: existing })],
            ['update', t('documentScan.fieldUseLease', { value: scanned })],
          ] as const
        ).map(([mode, btnLabel]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="flex-1 h-9 rounded-[9px] text-[13px] font-medium transition-colors px-2 truncate"
            style={{
              border: `1px solid ${choice === mode ? 'var(--color-primary)' : 'var(--color-outline)'}`,
              color: choice === mode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: 'var(--color-surface)',
            }}
          >
            {btnLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
