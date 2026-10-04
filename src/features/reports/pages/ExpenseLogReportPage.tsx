import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
import { formatMoney } from '@/shared/utils/money';
import { monthDivider, reportTheme } from '../reportTheme';
import { DownloadButton, OwnerExportPicker, useOwnerSelection, useReportOwners } from '../components/OwnerExportPicker';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

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
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);

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

  // ── Comparison with the year before ───────────────────────────────────────────────
  // While the year is still running, a full previous year would always look bigger, so the
  // current year is measured against the same stretch of last year (1 January to today).
  const today = new Date();
  const isPartialYear = selectedYear === currentYear;
  const prevYear = selectedYear - 1;
  const cutoff = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const prevTotal = sum(
    forSelectedOwners(allExpenses).filter(
      (tx) =>
        tx.date_of_payment.startsWith(String(prevYear)) &&
        (!isPartialYear || tx.date_of_payment.slice(5, 10) <= cutoff),
    ),
  );
  const change = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

  // ── Category totals, largest first ────────────────────────────────────────────────
  const categoryTotals = (() => {
    const map = new Map<string, number>();
    for (const tx of expenses) map.set(categoryLabel(tx), (map.get(categoryLabel(tx)) ?? 0) + tx.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const categoryTotal = (category: string) => categoryTotals.find(([name]) => name === category)?.[1] ?? 0;
  const uncategorisedCount = expenses.filter((tx) => !tx.category_name).length;

  // ── Pivot: one row per property, one column per category, grouped by owner ───────
  // Same shape and order as the PDF (uncategorised last).
  const pivotCategories = [
    ...categoryTotals.map(([name]) => name).filter((name) => name !== uncategorised),
    ...(uncategorisedCount ? [uncategorised] : []),
  ];

  const pivotOwners = (() => {
    const byOwner = new Map<string, Map<string, Map<string, number>>>();
    for (const tx of expenses) {
      const owner = propertyById.get(tx.property_id)?.property_owner || t('reports.noOwner');
      const property = propertyLabel(tx);
      const category = categoryLabel(tx);
      const byProperty = byOwner.get(owner) ?? new Map<string, Map<string, number>>();
      const cells = byProperty.get(property) ?? new Map<string, number>();
      cells.set(category, (cells.get(category) ?? 0) + tx.amount);
      byProperty.set(property, cells);
      byOwner.set(owner, byProperty);
    }
    return [...byOwner.entries()].map(([owner, byProperty]) => ({
      owner,
      properties: [...byProperty.entries()].map(([address, cells]) => ({
        address,
        cells,
        total: [...cells.values()].reduce((s, v) => s + v, 0),
      })),
    }));
  })();

  const pivotRows = pivotOwners.flatMap((o) => o.properties);
  const topProperty = pivotRows.reduce<(typeof pivotRows)[number] | null>(
    (best, p) => (!best || p.total > best.total ? p : best),
    null,
  );
  const topCategory = categoryTotals.find(([name]) => name !== uncategorised) ?? null;
  const propertyOptions = pivotRows.map((p) => p.address).sort();

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
          onChange={(v) => { setSelectedYear(Number(v)); setFilter(NO_FILTER); }}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          size="sm"
        />
        <OwnerExportPicker selection={ownerSelection} />
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
            {/* Headline numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-[var(--radius-card)] p-4" style={card}>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.totalExpenses')}</p>
                <LtrSpan className="text-[24px] font-bold mt-1 block" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {change === null ? (
                    t('reports.noComparison', { year: prevYear })
                  ) : (
                    <>
                      {/* Spending more is the bad direction on an expense report. */}
                      <LtrSpan className="font-semibold" style={{ color: change > 0 ? 'var(--color-exp-fg)' : 'var(--color-rev-fg)' }}>
                        {change > 0 ? '+' : ''}{Math.round(change * 100)}%
                      </LtrSpan>{' '}
                      {t(isPartialYear ? 'reports.vsSamePeriod' : 'reports.vsYear', { year: prevYear })}
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] p-4 min-w-0" style={card}>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.topProperty')}</p>
                {topProperty && (
                  <>
                    <button
                      onClick={() => showExpenses({ property: topProperty.address, category: null })}
                      className="block w-full text-start mt-1.5 bg-transparent border-none p-0 cursor-pointer hover:underline"
                    >
                      <span dir={autoDir} className="block text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{topProperty.address}</span>
                    </button>
                    <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <LtrSpan style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(topProperty.total)}</LtrSpan> · {Math.round((topProperty.total / total) * 100)}%
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-[var(--radius-card)] p-4 min-w-0" style={card}>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.topCategory')}</p>
                {topCategory ? (
                  <>
                    <button
                      onClick={() => showExpenses({ property: null, category: topCategory[0] })}
                      className="block w-full text-start mt-1.5 bg-transparent border-none p-0 cursor-pointer hover:underline"
                    >
                      <span className="block text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{topCategory[0]}</span>
                    </button>
                    <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <LtrSpan style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(topCategory[1])}</LtrSpan> · {Math.round((topCategory[1] / total) * 100)}%
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] font-bold mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>—</p>
                )}
              </div>

              <div className="rounded-[var(--radius-card)] p-4" style={card}>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.readyToExport')}</p>
                {uncategorisedCount ? (
                  <>
                    <button
                      onClick={() => showExpenses({ property: null, category: uncategorised })}
                      className="block text-start mt-1.5 bg-transparent border-none p-0 cursor-pointer hover:underline text-[14px] font-bold"
                      style={{ color: 'var(--color-exp-fg)' }}
                    >
                      {t('reports.uncategorisedCount', { count: uncategorisedCount })}
                    </button>
                    <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.uncategorisedHint')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-bold mt-1.5" style={{ color: 'var(--color-rev-fg)' }}>{t('reports.allCategorised')}</p>
                    <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('reports.transactionsCategoriesMeta', { txCount: expenses.length, catCount: categoryTotals.length })}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* The pivot, first — as in the PDF. Property per row, category per column,
                grouped by owner; every figure opens the expenses behind it. */}
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('reports.summaryByCategoryProperty')}</p>
              <p className="text-[11.5px] mt-0.5 mb-3" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.pivotHint')}</p>
              <div className="overflow-x-auto">
                <div className="rounded-[var(--radius-card)] overflow-hidden min-w-max" style={{ border: `1px solid ${reportTheme.gridStrong}` }}>
                  <div className="flex items-center text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                    <div className="flex-1 min-w-[16rem] px-4 py-2.5">{t('reports.property')}</div>
                    {pivotCategories.map((cat) => (
                      <div key={cat} className="w-28 shrink-0 px-2 py-2.5 text-end" style={{ color: 'rgba(255,255,255,0.75)', ...monthDivider('header') }}>{cat}</div>
                    ))}
                    <div className="w-28 shrink-0 px-2 py-2.5 text-end">{t('reports.total')}</div>
                  </div>

                  {pivotOwners.map((group) => (
                    <div key={group.owner}>
                      <div className="px-4 py-2 text-[11px] font-bold" style={{ background: 'var(--color-rev-bg)', color: 'var(--color-text-primary)' }}>
                        {t('property.owner')}: {group.owner}
                      </div>
                      {group.properties.map((row) => (
                        <div key={row.address} className="flex items-center" style={{ borderTop: `1px solid ${reportTheme.gridLight}` }}>
                          <div className="flex-1 min-w-[16rem] px-4 py-2">
                            <button
                              onClick={() => showExpenses({ property: row.address, category: null })}
                              dir={autoDir}
                              className="block w-full truncate text-start text-[12.5px] font-semibold bg-transparent border-none p-0 cursor-pointer hover:underline"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {row.address}
                            </button>
                          </div>
                          {pivotCategories.map((cat) => {
                            const amount = row.cells.get(cat);
                            return (
                              <div key={cat} className="w-28 shrink-0 px-2 py-2 text-end text-[11.5px]" style={{ color: amount ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}>
                                {amount ? (
                                  <button onClick={() => showExpenses({ property: row.address, category: cat })} className={cellButton}>
                                    <LtrSpan>{formatMoney(amount)}</LtrSpan>
                                  </button>
                                ) : '—'}
                              </div>
                            );
                          })}
                          <div
                            className="w-28 shrink-0 px-2 py-2 text-end text-[12.5px] font-bold"
                            style={{ background: reportTheme.totalColBg, borderInlineStart: `2px solid ${reportTheme.gridStrong}`, color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}
                          >
                            <LtrSpan>{formatMoney(row.total)}</LtrSpan>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="flex items-center text-[12.5px] font-bold" style={{ borderTop: `2px solid ${reportTheme.gridStrong}`, background: reportTheme.netRowBg }}>
                    <div className="flex-1 min-w-[16rem] px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{t('reports.total')}</div>
                    {pivotCategories.map((cat) => (
                      <div key={cat} className="w-28 shrink-0 px-2 py-2.5 text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}>
                        <button onClick={() => showExpenses({ property: null, category: cat })} className={cellButton}>
                          <LtrSpan>{formatMoney(categoryTotal(cat))}</LtrSpan>
                        </button>
                      </div>
                    ))}
                    <div
                      className="w-28 shrink-0 px-2 py-2.5 text-end"
                      style={{ background: reportTheme.totalColBgNet, borderInlineStart: `2px solid ${reportTheme.gridStrong}`, color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      <LtrSpan>{formatMoney(total)}</LtrSpan>
                    </div>
                  </div>
                </div>
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
                            <span className="font-semibold ms-2" style={{ color: 'var(--color-exp-fg)' }}>{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-outline)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-exp-fg)' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] p-4" style={card}>
                <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('reports.byMonth')}</p>
                {/* Months run left to right in both languages, like a calendar strip. */}
                <div dir="ltr" className="flex items-end gap-1.5 h-40">
                  {byMonth.map((amount, m) => (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0" title={`${monthLabel(m)}: ${formatMoney(amount)}`}>
                      <div
                        className="w-full rounded-t-[3px]"
                        style={{
                          height: maxMonth > 0 ? `${(amount / maxMonth) * 100}%` : 0,
                          minHeight: amount > 0 ? 2 : 0,
                          background: 'var(--color-exp-fg)',
                          opacity: 0.85,
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
                      <div className="flex-1 min-w-0 hidden md:block text-[12px] truncate" style={{ color: tx.category_name ? 'var(--color-text-secondary)' : 'var(--color-exp-fg)' }}>{categoryLabel(tx)}</div>
                      <div dir={autoDir} className="flex-1 min-w-0 hidden sm:block text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{propertyLabel(tx)}</div>
                      <LtrSpan className="w-[96px] shrink-0 text-end text-[13px] font-semibold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(tx.amount)}
                      </LtrSpan>
                    </div>
                  ))
                )}

                <div className="flex items-center px-4 py-3.5" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)' }}>
                  <div className="flex-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{isFiltered ? t('reports.filteredTotal') : t('reports.grandTotal')}</div>
                  <LtrSpan className="text-[16px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(sum(visible))}</LtrSpan>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
