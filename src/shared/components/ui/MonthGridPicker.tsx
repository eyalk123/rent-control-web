import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  selectedMonths: Set<string>;
  onToggle: (month: string) => void;
  gridYear: number;
  onGridYearChange: (year: number) => void;
}

export function MonthGridPicker({ selectedMonths, onToggle, gridYear, onGridYearChange }: Props) {
  const { t, i18n } = useTranslation();
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
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[var(--color-outline)] transition-colors"
        >
          <ChevronLeft size={15} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{gridYear}</span>
        <button
          type="button"
          onClick={() => onGridYearChange(gridYear + 1)}
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[var(--color-outline)] transition-colors"
        >
          <ChevronRight size={15} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      {/* 3×4 month grid */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
        {monthNames.map((name, i) => {
          const monthStr = `${gridYear}-${String(i + 1).padStart(2, '0')}-01`;
          const selected = selectedMonths.has(monthStr);
          return (
            <button
              key={monthStr}
              type="button"
              onClick={() => onToggle(monthStr)}
              className="h-9 rounded-[8px] text-[12px] font-medium transition-colors"
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
