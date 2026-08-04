import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { downloadIncomeExpenseReport, type ReportFormat } from '../api/reports';
import { getAllTransactions } from '@/features/transactions/api/transactions';
import { useProperties } from '@/features/properties/queries';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { PropTile } from '@/shared/components/ui/PropTile';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { formatMoney } from '@/shared/utils/money';
import { monthDivider, reportCols, reportTheme } from '../reportTheme';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

import i18n from '@/core/i18n';

/**
 * A monthly figure, in full, with thousands separators — the same `{:,.0f}` the PDF prints.
 *
 * This used to abbreviate to whole thousands, which rendered 4,100 revenue and 3,750 net both
 * as "4k": two different numbers wearing the same label, and a row whose own arithmetic looked
 * broken (4k − 350 = 4k). The columns have room for the real figures.
 */
function formatCell(v: number): string {
  if (v === 0) return '—';
  return Math.round(v).toLocaleString(i18n.language);
}

/**
 * The date a transaction is reported under.
 *
 * Revenue belongs to the month it is *for* — January's rent paid on 31 December is January's
 * revenue — while an expense belongs to the day it was paid. This must match
 * `get_income_expense_data` on the backend, or this preview and the PDF you download from it
 * put the same payment in different years.
 */
function reportingDate(tx: Transaction): string {
  return tx.type === 'revenue' ? (tx.month_for ?? tx.date_of_payment) : tx.date_of_payment;
}

function useAllTransactionsForYear(year: number) {
  return useQuery({
    queryKey: ['transactions', 'all-for-year', year],
    queryFn: () => getAllTransactions(),
    select: (data: Transaction[]) => data.filter((tx) => reportingDate(tx).startsWith(String(year))),
  });
}

export function IncomeExpenseReportPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);

  const { data: properties = [] } = useProperties();
  const { data: transactions = [], isLoading, isError, refetch } = useAllTransactionsForYear(selectedYear);

  const monthsLocale = Array.from({ length: 12 }, (_, idx) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(selectedYear, idx, 1))
  );

  // Build matrix: property × month → {rev, exp}
  const rows = properties.map((p) => {
    const monthly = monthsLocale.map((_, idx) => {
      const prefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const ptxs = transactions.filter((tx) => tx.property_id === p.id && reportingDate(tx).startsWith(prefix));
      const rev = ptxs.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
      const exp = ptxs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      return { rev, exp };
    });
    const totalRev = monthly.reduce((s, m) => s + m.rev, 0);
    const totalExp = monthly.reduce((s, m) => s + m.exp, 0);
    return { p, monthly, totalRev, totalExp };
  });

  const grand = rows.reduce((acc, r) => ({ rev: acc.rev + r.totalRev, exp: acc.exp + r.totalExp }), { rev: 0, exp: 0 });

  // Grouped by owner, one block per property — the same shape as the exported PDF, which is
  // organised owner → property → Revenue / Expenses / Net.
  const ownerGroups = (() => {
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const owner = row.p.property_owner || t('reports.noOwner');
      groups.set(owner, [...(groups.get(owner) ?? []), row]);
    }
    return [...groups.entries()].map(([owner, ownerRows]) => ({
      owner,
      rows: ownerRows,
      monthlyNet: monthsLocale.map((_, idx) =>
        ownerRows.reduce((s, r) => s + r.monthly[idx].rev - r.monthly[idx].exp, 0)),
      totalNet: ownerRows.reduce((s, r) => s + r.totalRev - r.totalExp, 0),
    }));
  })();

  const handleDownload = async (fmt: ReportFormat) => {
    setIsDownloading(fmt);
    try {
      await downloadIncomeExpenseReport(selectedYear, fmt);
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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('reports.incomeExpense')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.calendarYear', { year: selectedYear })}</p>
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
        <div className="ms-auto flex gap-6">
          {[
            { label: t('reports.revenue'), value: grand.rev, color: 'var(--color-rev-fg)' },
            { label: t('reports.expenses'), value: grand.exp, color: 'var(--color-exp-fg)' },
            { label: t('reports.net'), value: grand.rev - grand.exp, color: grand.rev - grand.exp >= 0 ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
              <LtrSpan className="text-[14px] font-bold mt-0.5" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value)}</LtrSpan>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix table */}
      <div className="px-4 lg:px-8 py-6">
        {isLoading ? <PageLoader /> : isError ? (
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
        ) : (
          <>
            {/* The pivot is 1120px wide by design (12 months + totals) and cannot usefully
                reflow at 390px, so it scrolls. Tell mobile users that, since there is no
                scrollbar on touch. */}
            <p className="lg:hidden mb-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('reports.scrollHint')}
            </p>
            <div className="overflow-x-auto">
            <div className="rounded-[var(--radius-card)] overflow-hidden min-w-[1120px]" style={{ border: `1px solid ${reportTheme.gridStrong}` }}>
              {/* Header row. Padding lives inside the cells so every label sits directly above
                  the figures beneath it — see the note in reportTheme. */}
              <div className="flex items-center py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                <div className={`${reportCols.property} px-4`}>{t('reports.property')}</div>
                <div className={reportCols.metric} />
                {monthsLocale.map((m) => (
                  <div key={m} className={`${reportCols.month} pe-2`} style={{ color: 'rgba(255,255,255,0.7)', ...monthDivider('header') }}>{m}</div>
                ))}
                <div className={`${reportCols.total} pe-3`} style={monthDivider('header')}>{t('reports.total')}</div>
              </div>

              {ownerGroups.map((group) => (
                <div key={group.owner}>
                  <div
                    className="px-4 py-2 text-[11px] font-bold"
                    style={{ background: 'var(--color-rev-bg)', color: 'var(--color-text-primary)' }}
                  >
                    {t('property.owner')}: {group.owner}
                  </div>

                  {group.rows.map((r) => {
                    const metrics = [
                      { key: 'rev', label: t('reports.revenue'), values: r.monthly.map((m) => m.rev), total: r.totalRev, color: 'var(--color-rev-fg)', isNet: false },
                      { key: 'exp', label: t('reports.expenses'), values: r.monthly.map((m) => m.exp), total: r.totalExp, color: 'var(--color-exp-fg)', isNet: false },
                      { key: 'net', label: t('reports.net'), values: r.monthly.map((m) => m.rev - m.exp), total: r.totalRev - r.totalExp, color: null, isNet: true },
                    ];
                    return (
                      /* One property = one block. The lines inside it are faint and the line
                         around it is not, so the three rows read as a single property. */
                      <div key={r.p.id} className="flex" style={{ borderTop: `2px solid ${reportTheme.gridStrong}` }}>
                        <div className={`${reportCols.property} flex items-center gap-2.5 px-4 py-2`}>
                          <PropTile propertyId={r.p.id} size={28} />
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {r.p.address}
                              <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatFloorApartment(r.p, t)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0" style={{ borderInlineStart: `2px solid ${reportTheme.gridStrong}` }}>
                          {metrics.map((metric, mIdx) => (
                            <div
                              key={metric.key}
                              className="flex items-center"
                              style={{
                                borderTop: mIdx ? `1px solid ${reportTheme.gridLight}` : undefined,
                                background: metric.isNet ? reportTheme.netRowBg : undefined,
                              }}
                            >
                              <div className={`${reportCols.metric} ps-3 py-1.5 text-[11px] ${metric.isNet ? 'font-bold' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                                {metric.label}
                              </div>
                              {metric.values.map((v, idx) => (
                                <div
                                  key={idx}
                                  className={`${reportCols.month} pe-2 py-1.5 text-[11.5px] ${metric.isNet ? 'font-bold' : 'font-medium'}`}
                                  style={{
                                    color: v === 0 ? 'var(--color-text-secondary)' : (metric.color ?? (v > 0 ? 'var(--color-success)' : 'var(--color-error)')),
                                    fontVariantNumeric: 'tabular-nums',
                                    ...monthDivider('body'),
                                  }}
                                >
                                  {formatCell(v)}
                                </div>
                              ))}
                              <div
                                className={`${reportCols.total} pe-3 py-1.5 text-[12.5px] font-bold`}
                                style={{
                                  background: metric.isNet ? reportTheme.totalColBgNet : reportTheme.totalColBg,
                                  borderInlineStart: `2px solid ${reportTheme.gridStrong}`,
                                  color: metric.color ?? (metric.total >= 0 ? 'var(--color-success)' : 'var(--color-error)'),
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatMoney(metric.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Owner total, net per month — matches the PDF's OWNER TOTAL (net) row. */}
                  <div className="flex items-center" style={{ borderTop: `2px solid ${reportTheme.gridStrong}`, background: 'var(--color-input-filled-background)' }}>
                    <div className={`${reportCols.property} px-4 py-2.5 text-[12px] font-bold`} style={{ color: 'var(--color-text-primary)' }}>
                      {t('reports.ownerTotalNet')}
                    </div>
                    <div className={reportCols.metric} />
                    {group.monthlyNet.map((net, idx) => (
                      <div key={idx} className={`${reportCols.month} pe-2 py-2.5 text-[11.5px] font-bold`} style={{ color: net === 0 ? 'var(--color-text-secondary)' : net > 0 ? 'var(--color-success)' : 'var(--color-error)', fontVariantNumeric: 'tabular-nums', ...monthDivider('body') }}>
                        {formatCell(net)}
                      </div>
                    ))}
                    <div
                      className={`${reportCols.total} pe-3 py-2.5 text-[13px] font-bold`}
                      style={{
                        background: reportTheme.totalColBgNet,
                        borderInlineStart: `2px solid ${reportTheme.gridStrong}`,
                        color: group.totalNet >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(group.totalNet)}
                    </div>
                  </div>
                </div>
              ))}

            </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
