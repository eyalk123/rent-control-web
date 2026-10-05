import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { downloadExpenseLogReport, type ReportFormat } from '../api/reports';
import { getAllTransactions } from '@/features/transactions/api/transactions';
import { useAccessibleProperties } from '@/features/properties/queries';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { PropTile } from '@/shared/components/ui/PropTile';
import { formatMoney } from '@/shared/utils/money';
import { monthDivider, reportTheme } from '../reportTheme';
import { DownloadButton, OwnerExportPicker, useOwnerSelection, useReportOwners } from '../components/OwnerExportPicker';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { useToast } from '@/shared/components/ui/Toast';
import type { Property, Transaction } from '@/shared/types';

/** Every expense on the account. The page needs two years — the one shown and the one it is
 *  compared against — so it fetches once and slices, rather than once per year. */
function useAllExpenses() {
  return useQuery({
    queryKey: ['transactions', 'expenses-all'],
    queryFn: () => getAllTransactions({ type: 'expense' }),
  });
}

import i18n from '@/core/i18n';

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(d);
}

function monthLabel(month: number): string {
  return new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2000, month, 1));
}

const sum = (txs: Transaction[]) => txs.reduce((s, tx) => s + tx.amount, 0);

/** "+25%" / "−7%". Shown in a neutral colour: a change in spending is information, not a verdict. */
const formatChange = (change: number) => `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(Math.round(change * 100))}%`;

/** What the list is narrowed to. Set from the pivot, the headline cards or the selects. */
interface Filter {
  property: string | null;
  category: string | null;
}
const NO_FILTER: Filter = { property: null, category: null };

const card = { background: 'var(--color-surface)', border: '1px solid var(--color-outline)' };
const cellButton = 'w-full text-end bg-transparent border-none p-0 cursor-pointer hover:underline [color:inherit] [font:inherit]';
const selectClass =
  'h-9 max-w-full rounded-[9px] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]';

/**
 * One pivot row's figures: a cell per category, then the row's total. With `onOpen`, each
 * figure opens the expenses behind it. `strong` is for total rows.
 */
function PivotFigures({ cells, total, categories, strong, onOpen }: {
  cells: Map<string, number>;
  total: number;
  categories: string[];
  strong?: boolean;
  onOpen?: (category: string) => void;
}) {
  return (
    <>
      {categories.map((cat) => {
        const amount = cells.get(cat);
        return (
          <div
            key={cat}
            className={`w-28 shrink-0 px-2 py-2 flex items-center justify-end ${strong ? 'text-[12px]' : 'text-[11.5px]'}`}
            style={{ color: amount ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}
          >
            {!amount ? '—' : onOpen ? (
              <button onClick={() => onOpen(cat)} className={cellButton}>
                <LtrSpan>{formatMoney(amount)}</LtrSpan>
              </button>
            ) : (
              <LtrSpan>{formatMoney(amount)}</LtrSpan>
            )}
          </div>
        );
      })}
      <div
        className="w-28 shrink-0 px-2 py-2 flex items-center justify-end text-[12.5px] font-bold"
        style={{
          background: strong ? reportTheme.totalColBgNet : reportTheme.totalColBg,
          borderInlineStart: `2px solid ${reportTheme.gridStrong}`,
          color: 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <LtrSpan>{formatMoney(total)}</LtrSpan>
      </div>
    </>
  );
}

export function ExpenseLogReportPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  // Only on mobile: let the browser infer each cell's direction so an LTR supplier or
  // address truncates on its own trailing edge. In an RTL page these cells otherwise cut
  // the informative half ("…Plumber"). Desktop keeps the current alignment untouched.
  const autoDir = useMediaQuery('(max-width: 1023px)') ? ('auto' as const) : undefined;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  /** The year-over-year segment under the pointer, read out under the bars. */
  const [hovered, setHovered] = useState<{ year: number; name: string; amount: number; yearAmount: number } | null>(null);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);
  const changeYear = (year: number) => {
    setSelectedYear(year);
    setFilter(NO_FILTER);
  };

  const { data: allExpenses = [], isLoading, isError, refetch } = useAllExpenses();
  const { data: properties = [] } = useAccessibleProperties();
  // The preview follows the owner selection, so it stays the report you are about to export.
  // An expense whose property is not in the list counts as the no-owner group, as it does in
  // the backend's report.
  const allOwners = useReportOwners();
  const ownerSelection = useOwnerSelection(allOwners);
  const forSelectedOwners = (txs: Transaction[]) => {
    if (ownerSelection.isAll) return txs;
    const included = new Set(ownerSelection.selected);
    const ownerOf = new Map(properties.map((p) => [p.id, p.property_owner || '']));
    return txs.filter((tx) => included.has(ownerOf.get(tx.property_id) ?? ''));
  };
  const expenses = forSelectedOwners(allExpenses)
    .filter((tx) => tx.date_of_payment.startsWith(String(selectedYear)))
    .sort((a, b) => a.date_of_payment.localeCompare(b.date_of_payment));

  const uncategorised = t('reports.uncategorised');
  /** Built-in categories are stored by key and translated for display; the rest are free text. */
  const categoryLabel = (tx: Transaction) =>
    tx.category_name ? translateCategory(tx.category_name, t) : uncategorised;

  // A transaction carries only `property_id`, so the owner and address come from the
  // properties list — the same join the backend does when it builds the pivot.
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const propertyLabel = (tx: Transaction) => {
    const p = propertyById.get(tx.property_id);
    return p ? `${p.address}, ${p.city}` : tx.property_name || '—';
  };

  const total = sum(expenses);

  // ── Year over year: the years in the picker, oldest first ──────────────────────────
  // Each completed year is compared with the full year before it. The running year shows
  // "so far" instead: part of a year against a whole one would always read as a drop.
  const ownerExpenses = forSelectedOwners(allExpenses);
  const inYear = (tx: Transaction, year: number) => tx.date_of_payment.startsWith(String(year));
  const yearTotal = (year: number) => sum(ownerExpenses.filter((tx) => inYear(tx, year)));

  // Each bar is split by category. The five biggest categories across the whole window get
  // a colour each and the rest share a grey "Other" — more colours than that stop being
  // tellable apart. The colour follows the category, not its rank in the selected year, so
  // switching years never repaints Maintenance; the By category bars below use the same.
  const windowTotals = new Map<string, number>();
  for (const tx of ownerExpenses) {
    if (!years.some((y) => inYear(tx, y))) continue;
    windowTotals.set(categoryLabel(tx), (windowTotals.get(categoryLabel(tx)) ?? 0) + tx.amount);
  }
  // The built-in "Other" category means the same as the grey bucket, so it folds into it
  // rather than appearing twice under one name.
  const builtInOther = translateCategory('other', t);
  const colouredCategories = [...windowTotals.entries()]
    .filter(([name]) => name !== uncategorised && name !== builtInOther)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
  const categoryColor = (name: string) => {
    const slot = colouredCategories.indexOf(name);
    return slot >= 0 ? `var(--color-chart-${slot + 1})` : 'var(--color-chart-other)';
  };
  /** The bucket's key — a string no category can be named, so it never collides with one. */
  const OTHER = '\u0000other';
  const seriesName = (key: string) => (key === OTHER ? t('reports.otherCategories') : key);
  const seriesOf = (tx: Transaction) => {
    const name = categoryLabel(tx);
    return colouredCategories.includes(name) ? name : OTHER;
  };
  const series = [...colouredCategories, OTHER];

  const yearRows = [...years].reverse().map((year) => {
    const txs = ownerExpenses.filter((tx) => inYear(tx, year));
    const amount = sum(txs);
    const before = yearTotal(year - 1);
    const segments = series
      .map((name) => ({ name, amount: sum(txs.filter((tx) => seriesOf(tx) === name)) }))
      .filter((s) => s.amount > 0);
    return { year, amount, segments, change: before > 0 ? (amount - before) / before : null };
  });
  const maxYear = Math.max(...yearRows.map((r) => r.amount), 0);
  const legend = series.filter((name) => yearRows.some((r) => r.segments.some((s) => s.name === name)));

  // ── Category totals, largest first ────────────────────────────────────────────────
  const categoryTotals = (() => {
    const map = new Map<string, number>();
    for (const tx of expenses) map.set(categoryLabel(tx), (map.get(categoryLabel(tx)) ?? 0) + tx.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const uncategorisedCount = expenses.filter((tx) => !tx.category_name).length;

  // ── Pivot: one row per property, one column per category, grouped by owner ───────
  // Same shape and order as the PDF (uncategorised last).
  const pivotCategories = [
    ...categoryTotals.map(([name]) => name).filter((name) => name !== uncategorised),
    ...(uncategorisedCount ? [uncategorised] : []),
  ];

  const pivotOwners = (() => {
    type Row = { key: string; property?: Property; cells: Map<string, number>; total: number };
    const byOwner = new Map<string, Map<string, Row>>();
    for (const tx of expenses) {
      const property = propertyById.get(tx.property_id);
      const owner = property?.property_owner || t('reports.noOwner');
      const key = propertyLabel(tx);
      const rows = byOwner.get(owner) ?? new Map<string, Row>();
      const row = rows.get(key) ?? { key, property, cells: new Map<string, number>(), total: 0 };
      const category = categoryLabel(tx);
      row.cells.set(category, (row.cells.get(category) ?? 0) + tx.amount);
      row.total += tx.amount;
      rows.set(key, row);
      byOwner.set(owner, rows);
    }
    return [...byOwner.entries()].map(([owner, rows]) => {
      const properties = [...rows.values()];
      const cells = new Map<string, number>();
      for (const row of properties) for (const [cat, v] of row.cells) cells.set(cat, (cells.get(cat) ?? 0) + v);
      return { owner, properties, cells, total: properties.reduce((s, r) => s + r.total, 0) };
    });
  })();

  // Owners start folded, so a many-owner portfolio opens as one line per owner — as on the
  // Income & Expense report. A lone owner is always open: folding the only group would just
  // hide the table behind a click. Which owners are open lives in the URL, like there.
  const [searchParams, setSearchParams] = useSearchParams();
  const expandedOwners = new Set(searchParams.getAll('owner'));
  const setExpandedOwners = (owners: Set<string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('owner');
      owners.forEach((o) => next.append('owner', o));
      return next;
    }, { replace: true });
  const canFold = pivotOwners.length > 1;
  const isOwnerOpen = (owner: string) => !canFold || expandedOwners.has(owner);
  const allOpen = pivotOwners.every((g) => isOwnerOpen(g.owner));
  const toggleOwner = (owner: string) => {
    if (!canFold) return;
    const next = new Set(expandedOwners);
    if (next.has(owner)) next.delete(owner);
    else next.add(owner);
    setExpandedOwners(next);
  };
  const toggleAllOwners = () =>
    setExpandedOwners(allOpen ? new Set() : new Set(pivotOwners.map((g) => g.owner)));
  // The list filters by property and category, not owner, so an owner's figures only open
  // the expenses behind them when that owner is the whole report.
  const filterableOwner = pivotOwners.length === 1;

  const pivotRows = pivotOwners.flatMap((o) => o.properties);
  const propertyOptions = pivotRows.map((p) => p.key).sort();

  // ── By month ──────────────────────────────────────────────────────────────────────
  const byMonth = Array.from({ length: 12 }, (_, m) =>
    sum(expenses.filter((tx) => Number(tx.date_of_payment.slice(5, 7)) === m + 1)),
  );
  const maxMonth = Math.max(...byMonth, 0);

  // ── The list, narrowed by whatever was clicked or picked ──────────────────────────
  const visible = expenses.filter(
    (tx) =>
      (!filter.property || propertyLabel(tx) === filter.property) &&
      (!filter.category || categoryLabel(tx) === filter.category),
  );
  const isFiltered = !!(filter.property || filter.category);

  /** Narrow the list and bring it into view, so a click in the summary visibly does something. */
  const showExpenses = (next: Filter) => {
    setFilter(next);
    requestAnimationFrame(() =>
      document.getElementById('expense-log-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const handleDownload = async (fmt: ReportFormat, split: boolean) => {
    setIsDownloading(fmt);
    try {
      await downloadExpenseLogReport(selectedYear, fmt, { owners: ownerSelection.exportOwners, split });
      // Names the owners when the report covered only some of them, so a download made
      // while looking at one owner's figures says so.
      showToast(
        ownerSelection.isAll
          ? t('reports.downloadSuccess')
          : t('reports.downloadSuccessFor', { owners: ownerSelection.names }),
        'success',
      );
    } catch {
      showToast(t('error.saveFailed'), 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 px-4 lg:px-8 pt-6 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1 text-[12px] font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} {t('screens.reports')}
          </button>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('reports.expenseLog')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('reports.expenseLogMeta', { count: expenses.length, total: formatMoney(total) })}
            {!ownerSelection.isAll && <> · {ownerSelection.names}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton
            format="pdf"
            selection={ownerSelection}
            busy={isDownloading === 'pdf'}
            disabled={!!isDownloading}
            onDownload={handleDownload}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-60"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          />
          <DownloadButton
            format="csv"
            selection={ownerSelection}
            busy={isDownloading === 'csv'}
            disabled={!!isDownloading}
            onDownload={handleDownload}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-8 py-3.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.year')}</span>
        <SegToggle
          value={String(selectedYear)}
          onChange={(v) => changeYear(Number(v))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          size="sm"
        />
        <OwnerExportPicker selection={ownerSelection} />
        {/* The year's total, and the one thing to fix before exporting — said once, here,
            rather than as cards. The warning only appears when there is something to fix. */}
        {!isLoading && !isError && expenses.length > 0 && (
          <div className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1">
            {uncategorisedCount > 0 && (
              <button
                onClick={() => showExpenses({ property: null, category: uncategorised })}
                className="text-[12.5px] font-medium bg-transparent border-none p-0 cursor-pointer hover:underline"
                style={{ color: 'var(--color-warning-fg)' }}
              >
                {t('reports.uncategorisedCount', { count: uncategorisedCount })}
              </button>
            )}
            <span className="inline-flex items-baseline gap-2">
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.totalExpenses')}</span>
              <LtrSpan className="text-[18px] font-bold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-6 flex flex-col gap-6">
        {isLoading ? (
          <PageLoader />
        ) : isError ? (
          <EmptyState
            title={t('error.loadFailed')}
            action={
              <button
                onClick={() => refetch()}
                className="h-9 px-4 rounded-[9px] text-[13px] font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {t('common.retry')}
              </button>
            }
          />
        ) : expenses.length === 0 ? (
          <EmptyState icon={undefined} title={t('reports.noExpenses')} description={t('reports.noExpensesForYear', { year: selectedYear })} />
        ) : (
          <>
            {/* The pivot, first — as in the PDF. Property per row, category per column, grouped
                by owner the way the Income & Expense table is: a large owner row that folds, an
                owner total under its properties, a portfolio total when there are several. */}
            <div>
              <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('reports.summaryByCategoryProperty')}</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.pivotHint')}</p>
                </div>
                {canFold && (
                  <button
                    type="button"
                    onClick={toggleAllOwners}
                    className="ms-auto inline-flex items-center gap-1 h-8 px-3 rounded-[9px] text-[12.5px] font-medium"
                    style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', cursor: 'pointer' }}
                  >
                    <ChevronDown size={14} style={{ transform: allOpen ? 'rotate(180deg)' : undefined }} />
                    {allOpen ? t('reports.collapseAll') : t('reports.expandAll')}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <div className="rounded-[var(--radius-card)] overflow-hidden min-w-max" style={{ border: `1px solid ${reportTheme.gridStrong}` }}>
                  <div className="flex items-center py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                    <div className="flex-1 min-w-[16rem] px-4">{t('reports.property')}</div>
                    {pivotCategories.map((cat) => (
                      <div key={cat} className="w-28 shrink-0 px-2 text-end" style={{ color: 'rgba(255,255,255,0.75)', ...monthDivider('header') }}>{cat}</div>
                    ))}
                    <div className="w-28 shrink-0 px-2 text-end" style={monthDivider('header')}>{t('reports.total')}</div>
                  </div>

                  {pivotOwners.map((group) => {
                    const open = isOwnerOpen(group.owner);
                    return (
                      <div key={group.owner}>
                        {/* The owner is the top of the hierarchy, so it is the largest row. Folded,
                            it carries the owner's own figures, so a folded table still reads as
                            a summary; open, they move to the Owner total row below. */}
                        <div className="flex items-stretch" style={{ background: 'var(--color-rev-bg)', color: 'var(--color-text-primary)', borderTop: `2px solid ${reportTheme.gridStrong}` }}>
                          <button
                            type="button"
                            onClick={() => toggleOwner(group.owner)}
                            aria-expanded={open}
                            className="flex-1 min-w-[16rem] flex items-center gap-2 px-3 py-3 text-start"
                            style={{ minHeight: 64, color: 'inherit', background: 'none', border: 'none', cursor: canFold ? 'pointer' : 'default' }}
                          >
                            <ChevronDown
                              size={18}
                              className="shrink-0 transition-transform"
                              style={{ color: 'var(--color-text-secondary)', transform: open ? undefined : `rotate(${isRtl ? 90 : -90}deg)` }}
                            />
                            <div className="min-w-0">
                              <p className="text-[14.5px] font-bold truncate">{t('property.owner')}: {group.owner}</p>
                              <p className="text-[11.5px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('reports.propertyCount', { count: group.properties.length })}
                              </p>
                            </div>
                          </button>
                          {!open && (
                            <PivotFigures
                              cells={group.cells}
                              total={group.total}
                              categories={pivotCategories}
                              onOpen={filterableOwner ? (cat) => showExpenses({ property: null, category: cat }) : undefined}
                            />
                          )}
                        </div>

                        {open && group.properties.map((row) => (
                          <div key={row.key} className="flex items-stretch" style={{ borderTop: `1px solid ${reportTheme.gridLight}` }}>
                            <div className="flex-1 min-w-[16rem] flex items-center gap-2.5 px-4 py-2">
                              {row.property && <PropTile propertyId={row.property.id} size={28} />}
                              <button
                                onClick={() => showExpenses({ property: row.key, category: null })}
                                dir={autoDir}
                                className="min-w-0 truncate text-start text-[12.5px] font-semibold bg-transparent border-none p-0 cursor-pointer hover:underline"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {row.property ? row.property.address : row.key}
                                {row.property && (
                                  <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(row.property, t)}</span>
                                )}
                              </button>
                            </div>
                            <PivotFigures
                              cells={row.cells}
                              total={row.total}
                              categories={pivotCategories}
                              onOpen={(cat) => showExpenses({ property: row.key, category: cat })}
                            />
                          </div>
                        ))}

                        {open && (
                          <div className="flex items-stretch font-bold" style={{ borderTop: `2px solid ${reportTheme.gridStrong}`, background: 'var(--color-input-filled-background)' }}>
                            <div className="flex-1 min-w-[16rem] px-4 py-2.5 text-[12px]" style={{ color: 'var(--color-text-primary)' }}>{t('reports.ownerTotal')}</div>
                            <PivotFigures
                              cells={group.cells}
                              total={group.total}
                              categories={pivotCategories}
                              strong
                              onOpen={filterableOwner ? (cat) => showExpenses({ property: null, category: cat }) : undefined}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Every owner together. With one owner it would repeat that owner's total. */}
                  {pivotOwners.length > 1 && (
                    <div className="flex items-stretch font-bold" style={{ borderTop: `3px solid ${reportTheme.gridStrong}` }}>
                      <div className="flex-1 min-w-[16rem] flex items-center px-4 py-3 text-[14.5px]" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                        {t('reports.portfolioTotal')}
                      </div>
                      <PivotFigures
                        cells={new Map(categoryTotals)}
                        total={total}
                        categories={pivotCategories}
                        strong
                        onOpen={(cat) => showExpenses({ property: null, category: cat })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Year over year. Each row opens that year; the change is against the full year before. */}
            <div className="rounded-[var(--radius-card)] p-4" style={card}>
              <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('reports.yearOverYear')}</p>
              <div className="flex flex-col gap-1" onMouseLeave={() => setHovered(null)}>
                {yearRows.map((row) => {
                  const selected = row.year === selectedYear;
                  return (
                    <button
                      key={row.year}
                      onClick={() => changeYear(row.year)}
                      aria-pressed={selected}
                      className="flex items-center gap-2 sm:gap-3 w-full rounded-md px-1.5 sm:px-2 py-1.5 border-none cursor-pointer text-start hover:bg-[var(--color-input-filled-background)]"
                      style={{ background: selected ? 'var(--color-input-filled-background)' : 'transparent' }}
                    >
                      <span className="w-9 sm:w-10 shrink-0 text-[12.5px]" style={{ color: 'var(--color-text-primary)', fontWeight: selected ? 700 : 500 }}>{row.year}</span>
                      <span className="flex-1 min-w-0 h-3">
                        {/* The bar's length is the year's total; inside it each category takes
                            its share, with a 2px gap so neighbouring colours never touch. */}
                        <span
                          className="flex h-full gap-[2px] rounded-[4px] overflow-hidden"
                          style={{ width: maxYear > 0 ? `${(row.amount / maxYear) * 100}%` : 0 }}
                        >
                          {row.segments.map((s) => (
                            <span
                              key={s.name}
                              className="h-full min-w-[2px]"
                              onMouseEnter={() => setHovered({ year: row.year, name: s.name, amount: s.amount, yearAmount: row.amount })}
                              style={{
                                flex: `${s.amount} 1 0`,
                                background: categoryColor(s.name),
                                opacity: hovered && (hovered.name !== s.name || hovered.year !== row.year) ? 0.45 : 1,
                              }}
                            />
                          ))}
                        </span>
                      </span>
                      <LtrSpan className="w-[4.75rem] sm:w-24 shrink-0 text-end text-[12px] sm:text-[12.5px]" style={{ color: 'var(--color-text-primary)', fontWeight: selected ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
                        {row.amount ? formatMoney(row.amount) : '—'}
                      </LtrSpan>
                      <span className="w-11 sm:w-16 shrink-0 text-end text-[11px] sm:text-[11.5px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.year === currentYear ? t('reports.soFar') : row.change === null ? '' : <LtrSpan>{formatChange(row.change)}</LtrSpan>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* What the pointer is on — a fixed line, so the card never jumps. */}
              <p className="h-5 mt-2 px-2 text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }} aria-live="polite">
                {hovered && (
                  <>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{seriesName(hovered.name)}</span>
                    {' · '}{hovered.year}{': '}
                    <LtrSpan style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(hovered.amount)}</LtrSpan>
                    {' · '}{Math.round((hovered.amount / hovered.yearAmount) * 100)}%
                  </>
                )}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-2 pt-3" style={{ borderTop: '1px solid var(--color-outline)' }}>
                {legend.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: categoryColor(name) }} />
                    {seriesName(name)}
                  </span>
                ))}
              </div>
            </div>

            {/* Share by category, and when in the year the money went out */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              <div className="rounded-[var(--radius-card)] p-4" style={card}>
                <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('reports.byCategory')}</p>
                <div className="flex flex-col gap-3">
                  {categoryTotals.map(([catName, catTotal]) => {
                    const pct = total > 0 ? (catTotal / total) * 100 : 0;
                    return (
                      <button
                        key={catName}
                        onClick={() => showExpenses({ property: null, category: catName })}
                        className="block w-full text-start bg-transparent border-none p-0 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-[12px] font-medium truncate group-hover:underline" style={{ color: 'var(--color-text-primary)' }}>{catName}</span>
                          <span className="text-[11.5px] shrink-0" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            <LtrSpan>{formatMoney(catTotal)}</LtrSpan>
                            <span className="font-semibold ms-2" style={{ color: 'var(--color-text-primary)' }}>{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-outline)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: categoryColor(catName) }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] p-4" style={card}>
                <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('reports.byMonth')}</p>
                {/* Months follow the reading direction, as the Income & Expense table's do. */}
                <div className="flex items-end gap-1.5 h-40">
                  {byMonth.map((amount, m) => (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0" title={`${monthLabel(m)}: ${formatMoney(amount)}`}>
                      <div
                        className="w-full rounded-t-[3px]"
                        style={{
                          height: maxMonth > 0 ? `${(amount / maxMonth) * 100}%` : 0,
                          minHeight: amount > 0 ? 2 : 0,
                          background: 'var(--color-primary)',
                          opacity: 0.7,
                        }}
                      />
                      <span className="text-[10px] truncate max-w-full" style={{ color: 'var(--color-text-secondary)' }}>{monthLabel(m)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Every expense, by date — the evidence behind the summary */}
            <div id="expense-log-list" className="scroll-mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('reports.allExpenses')}</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {isFiltered
                      ? t('reports.filteredMeta', { count: visible.length, total: expenses.length })
                      : t('reports.txCount', { count: expenses.length })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 max-w-full">
                  <select
                    aria-label={t('reports.property')}
                    value={filter.property ?? ''}
                    onChange={(e) => setFilter((f) => ({ ...f, property: e.target.value || null }))}
                    className={selectClass}
                  >
                    <option value="">{t('reports.allProperties')}</option>
                    {propertyOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select
                    aria-label={t('reports.category')}
                    value={filter.category ?? ''}
                    onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value || null }))}
                    className={selectClass}
                  >
                    <option value="">{t('reports.allCategories')}</option>
                    {pivotCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {isFiltered && (
                    <button
                      onClick={() => setFilter(NO_FILTER)}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-[9px] text-[12.5px] font-medium cursor-pointer"
                      style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
                    >
                      <X size={13} /> {t('reports.clearFilters')}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
                <div className="flex items-center gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                  <div className="w-[64px] shrink-0">{t('reports.date')}</div>
                  <div className="flex-[1.5] min-w-0">{t('reports.supplier')}</div>
                  <div className="flex-1 min-w-0 hidden md:block">{t('reports.category')}</div>
                  <div className="flex-1 min-w-0 hidden sm:block">{t('reports.property')}</div>
                  <div className="w-[96px] shrink-0 text-end">{t('reports.amount')}</div>
                </div>

                {visible.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.noMatchingExpenses')}</p>
                ) : (
                  visible.map((tx, i) => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-outline)' }}>
                      <div className="w-[64px] shrink-0 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(tx.date_of_payment)}</div>
                      <div className="flex-[1.5] min-w-0">
                        <p dir={autoDir} className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tx.supplier_name || categoryLabel(tx)}</p>
                        {tx.notes && <p dir={autoDir} className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{tx.notes}</p>}
                      </div>
                      <div className="flex-1 min-w-0 hidden md:block text-[12px] truncate" style={{ color: tx.category_name ? 'var(--color-text-secondary)' : 'var(--color-warning-fg)' }}>{categoryLabel(tx)}</div>
                      <div dir={autoDir} className="flex-1 min-w-0 hidden sm:block text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{propertyLabel(tx)}</div>
                      <LtrSpan className="w-[96px] shrink-0 text-end text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(tx.amount)}
                      </LtrSpan>
                    </div>
                  ))
                )}

                <div className="flex items-center px-4 py-3.5" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)' }}>
                  <div className="flex-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{isFiltered ? t('reports.filteredTotal') : t('reports.grandTotal')}</div>
                  <LtrSpan className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(sum(visible))}</LtrSpan>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
