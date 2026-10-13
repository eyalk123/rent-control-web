import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  selectedMonths: Set<string>;
  onToggle: (month: string) => void;
  gridYear: number;
  onGridYearChange: (year: number) => void;
  /** Months ("YYYY-MM") that can be picked; every other month is drawn disabled. Omit for no limit. */
  enabledMonths?: Set<string>;
  /** Year navigation stops here. */
  minYear?: number;
  maxYear?: number;
}

export function MonthGridPicker({ selectedMonths, onToggle, gridYear, onGridYearChange, enabledMonths, minYear, maxYear }: Props) {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLanguage();
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2000, i, 1))
  );

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-outline)', background: 'var(--color-surface)' }}>
      {/* Year navigation */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <button
          type="button"
          onClick={() => onGridYearChange(gridYear - 1)}
          disabled={minYear != null && gridYear <= minYear}
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[var(--color-outline)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          {isRtl ? <ChevronRight size={15} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronLeft size={15} style={{ color: 'var(--color-text-secondary)' }} />}
        </button>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{gridYear}</span>
        <button
          type="button"
          onClick={() => onGridYearChange(gridYear + 1)}
          disabled={maxYear != null && gridYear >= maxYear}
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[var(--color-outline)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          {isRtl ? <ChevronLeft size={15} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronRight size={15} style={{ color: 'var(--color-text-secondary)' }} />}
        </button>
      </div>

      {/* 3×4 month grid */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
        {monthNames.map((name, i) => {
          const monthStr = `${gridYear}-${String(i + 1).padStart(2, '0')}-01`;
          const selected = selectedMonths.has(monthStr);
          const disabled = !!enabledMonths && !selected && !enabledMonths.has(monthStr.slice(0, 7));
          return (
            <button
              key={monthStr}
              type="button"
              onClick={() => onToggle(monthStr)}
              disabled={disabled}
              className="h-9 rounded-[8px] text-[12px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: selected ? 'var(--color-primary)' : 'var(--color-input-filled-background)',
                color: selected ? 'white' : 'var(--color-text-primary)',
                border: selected ? '1px solid var(--color-primary)' : '1px solid transparent',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 text-center text-[12px]" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-outline)' }}>
        {t('transactions.bulkRevenue.monthsSelected', { count: selectedMonths.size })}
      </div>
    </div>
  );
}
