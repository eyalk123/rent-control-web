import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '@/shared/utils/categories';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { downloadExpenseLogReport, type ReportFormat } from '../api/reports';
import { getAllTransactions } from '@/features/transactions/api/transactions';
import { useProperties } from '@/features/properties/queries';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { monthDivider, reportTheme } from '../reportTheme';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

function useExpensesForYear(year: number) {
  return useQuery({
    queryKey: ['transactions', 'expenses-for-year', year],
    queryFn: () => getAllTransactions({ type: 'expense' }),
    select: (data: Transaction[]) => data.filter((tx) => tx.date_of_payment.startsWith(String(year))),
  });
}

import i18n from '@/core/i18n';

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(d);
}

export function ExpenseLogReportPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);

  const { data: expenses = [], isLoading, isError, refetch } = useExpensesForYear(selectedYear);
  const { data: properties = [] } = useProperties();

  /** Built-in categories are stored by key and translated for display; the rest are free text. */
  const categoryLabel = (tx: Transaction) =>
    tx.category_name ? translateCategory(tx.category_name, t) : t('reports.uncategorised');

  // Group by category
  const categoryMap = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = categoryLabel(tx);
    if (!categoryMap.has(key)) categoryMap.set(key, []);
    categoryMap.get(key)!.push(tx);
  }
  const categories = [...categoryMap.entries()].sort((a, b) => b[1].reduce((s, t) => s + t.amount, 0) - a[1].reduce((s, t) => s + t.amount, 0));
  const total = expenses.reduce((s, tx) => s + tx.amount, 0);

  // The pivot the PDF prints below the transaction list: one row per property, one column per
  // category, grouped by owner. Kept in the same order as the PDF (uncategorised last).
  const pivotCategories = [
    ...categories.map(([name]) => name).filter((name) => name !== t('reports.uncategorised')),
    ...(categoryMap.has(t('reports.uncategorised')) ? [t('reports.uncategorised')] : []),
  ];

  const pivotOwners = (() => {
    // A transaction carries only `property_id`, so the owner and address come from the
    // properties list — the same join the backend does when it builds this pivot.
    const propertyById = new Map(properties.map((p) => [p.id, p]));
    const byOwner = new Map<string, Map<string, Map<string, number>>>();
    for (const tx of expenses) {
      const property_ = propertyById.get(tx.property_id);
      const owner = property_?.property_owner || t('reports.noOwner');
      const property = property_ ? `${property_.address}, ${property_.city}` : tx.property_name || '—';
      const category = categoryLabel(tx);
      const byProperty = byOwner.get(owner) ?? new Map();
      const cells = byProperty.get(property) ?? new Map();
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

  const pivotCategoryTotal = (category: string) =>
    expenses.filter((tx) => categoryLabel(tx) === category).reduce((s, tx) => s + tx.amount, 0);

  const handleDownload = async (fmt: ReportFormat) => {
    setIsDownloading(fmt);
    try {
      await downloadExpenseLogReport(selectedYear, fmt);
      showToast(t('reports.downloadSuccess'), 'success');
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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('pdf')}
            disabled={!!isDownloading}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-60"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          >
            <Download size={14} /> {isDownloading === 'pdf' ? '…' : 'PDF'}
          </button>
          <button
            onClick={() => handleDownload('csv')}
            disabled={!!isDownloading}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}
          >
            <Download size={14} /> {isDownloading === 'csv' ? '…' : 'CSV'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-8 py-3.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.year')}</span>
        <SegToggle
          value={String(selectedYear)}
          onChange={(v) => setSelectedYear(Number(v))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-6">
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
          <div className="grid gap-5" style={{ gridTemplateColumns: isRtl ? '320px 1fr' : '1fr 320px', alignItems: 'start' }}>
            {/* Main table */}
            <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
              {/* Header */}
              <div className="flex items-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                <div className="w-[90px]">{t('reports.date')}</div>
                <div className="flex-[1.5]">{t('reports.supplierCategory')}</div>
                <div className="flex-1">{t('reports.property')}</div>
                <div className="w-[90px] text-end">{t('reports.amount')}</div>
              </div>

              {categories.map(([catName, txs]) => {
                const catTotal = txs.reduce((s, tx) => s + tx.amount, 0);
                return (
                  <div key={catName}>
                    {/* Category header */}
                    <div className="flex items-center px-4 py-2.5" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)', borderBottom: '1px solid var(--color-outline)' }}>
                      <div className="flex-1 text-[12.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{translateCategory(catName, t)}</div>
                      <LtrSpan className="text-[12.5px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(catTotal)}</LtrSpan>
                    </div>
                    {/* Rows */}
                    {txs.map((tx, i) => (
                      <div key={tx.id} className="flex items-center px-4 py-2.5" style={{ borderBottom: i === txs.length - 1 ? 'none' : '1px solid var(--color-outline)' }}>
                        <div className="w-[90px] text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(tx.date_of_payment)}</div>
                        <div className="flex-[1.5] min-w-0">
                          <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tx.supplier_name ?? (tx.category_name ? translateCategory(tx.category_name, t) : '—')}</p>
                          {tx.notes && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{tx.notes}</p>}
                        </div>
                        <div className="flex-1 text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{tx.property_name}</div>
                        <LtrSpan className="w-[90px] text-right text-[13px] font-semibold shrink-0" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(tx.amount)}
                        </LtrSpan>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Grand total */}
              <div className="flex items-center px-4 py-3.5" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)' }}>
                <div className="flex-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('reports.grandTotal')}</div>
                <LtrSpan className="text-[16px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
              </div>
            </div>

            {/* Right sidebar: % breakdown */}
            <div className="flex flex-col gap-3">
              <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('reports.byCategory')}</p>
                <div className="flex flex-col gap-3">
                  {categories.map(([catName, txs]) => {
                    const catTotal = txs.reduce((s, tx) => s + tx.amount, 0);
                    const pct = total > 0 ? (catTotal / total) * 100 : 0;
                    return (
                      <div key={catName}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{catName}</span>
                          <span className="text-[11.5px] font-semibold ms-2 shrink-0" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-outline)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-exp-fg)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.totalExpenses')}</p>
                <LtrSpan className="text-[24px] font-bold mt-1 block" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.transactionsCategoriesMeta', { txCount: expenses.length, catCount: categories.length })}</p>
              </div>
            </div>
          </div>
        )}

        {/* The pivot the PDF prints under the transaction list: property per row, category per
            column, grouped by owner. Same shape and shading as the export. */}
        {!isLoading && !isError && pivotOwners.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              {t('reports.summaryByCategoryProperty')}
            </p>
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
                        <div className="flex-1 min-w-[16rem] px-4 py-2 text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{row.address}</div>
                        {pivotCategories.map((cat) => (
                          <div key={cat} className="w-28 shrink-0 px-2 py-2 text-end text-[11.5px]" style={{ color: row.cells.get(cat) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}>
                            {row.cells.get(cat) ? formatMoney(row.cells.get(cat)!) : '—'}
                          </div>
                        ))}
                        <div
                          className="w-28 shrink-0 px-2 py-2 text-end text-[12.5px] font-bold"
                          style={{ background: reportTheme.totalColBg, borderInlineStart: `2px solid ${reportTheme.gridStrong}`, color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatMoney(row.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="flex items-center text-[12.5px] font-bold" style={{ borderTop: `2px solid ${reportTheme.gridStrong}`, background: reportTheme.netRowBg }}>
                  <div className="flex-1 min-w-[16rem] px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{t('reports.total')}</div>
                  {pivotCategories.map((cat) => (
                    <div key={cat} className="w-28 shrink-0 px-2 py-2.5 text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}>
                      {formatMoney(pivotCategoryTotal(cat))}
                    </div>
                  ))}
                  <div
                    className="w-28 shrink-0 px-2 py-2.5 text-end"
                    style={{ background: reportTheme.totalColBgNet, borderInlineStart: `2px solid ${reportTheme.gridStrong}`, color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatMoney(total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
