import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: number;
  label: string;
}

interface Props {
  label?: string;
  options: Option[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PropertyMultiSelect({ label, options, selectedIds, onChange, error, disabled, placeholder }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function toggleAll() {
    if (selectedIds.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  }

  const allSelected = options.length > 0 && selectedIds.length === options.length;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center justify-between w-full min-h-[42px] rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2 text-sm outline-none transition-colors ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedIds.length === 0 ? (
              <span className="text-[var(--color-placeholder)]">{placeholder ?? label}</span>
            ) : (
              selectedIds.map((id) => {
                const opt = options.find((o) => o.value === id);
                return opt ? (
                  <span key={id} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--color-outline)] text-[var(--color-text-primary)] whitespace-nowrap">
                    {opt.label}
                  </span>
                ) : null;
              })
            )}
          </div>
          <ChevronDown size={16} className="shrink-0 ml-2 text-[var(--color-text-secondary)]" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline)] shadow-lg overflow-hidden">
            <div className="p-1">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)] outline-none"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-input-border)]'}`}>
                  {allSelected && <Check size={10} className="text-white" />}
                </span>
                {allSelected ? t('transactions.bulkRevenue.deselectAll') : t('transactions.bulkRevenue.selectAll')}
              </button>
              {options.map((opt) => {
                const checked = selectedIds.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-outline)] outline-none"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-input-border)]'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
              {options.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{t('transactions.noPropertiesAvailable')}</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
