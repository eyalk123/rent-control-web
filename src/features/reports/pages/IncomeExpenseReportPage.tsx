import { useState, type CSSProperties, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import {
  defaultRevenueBasis,
  downloadIncomeExpenseReport,
  type ReportFormat,
  type RevenueBasis,
} from '../api/reports';
import { getAllTransactions } from '@/features/transactions/api/transactions';
import { useAccessibleProperties } from '@/features/properties/queries';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { InfoTip } from '@/shared/components/ui/InfoTip';
import { PropTile } from '@/shared/components/ui/PropTile';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { TransactionRow } from '@/shared/components/detail/TransactionRow';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { formatMoney, formatNumber } from '@/shared/utils/money';
import { monthDivider, reportCols, reportTheme } from '../reportTheme';
import { DownloadButton, OwnerExportPicker, useOwnerSelection, useReportOwners } from '../components/OwnerExportPicker';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

import i18n from '@/core/i18n';

/**
 * A monthly figure, in full, with the account's thousands separators.
 *
 * This used to abbreviate to whole thousands, which rendered 4,100 revenue and 3,750 net both
 * as "4k": two different numbers wearing the same label, and a row whose own arithmetic looked
 * broken (4k − 350 = 4k). The columns have room for the real figures.
 *
 * Grouped by the account's **country**, through `formatNumber`, not by the reading language.
 * This was the one place in the app that formatted a number without going through `money.ts`
 * — it called `toLocaleString(i18n.language)`, so a Spanish account reading in English saw
 * `2,289` in this grid and `2.289€` on every other screen. The month headings above still
 * follow the language, because a month *name* is a word and this is a number.
 */
function formatCell(v: number): string {
  if (v === 0) return '—';
  return formatNumber(Math.round(v));
}

/**
 * The date a transaction is reported under.
 *
 * Revenue belongs to the month it is *for* — January's rent paid on 31 December is January's
 * revenue — while an expense belongs to the day it was paid. This must match
 * `get_income_expense_data` on the backend, or this preview and the PDF you download from it
 * put the same payment in different years.
 */
/**
 * Which date decides the year and month a transaction lands in.
 *
 * **Only revenue moves with the basis.** Accrual counts rent toward the month it was
 * *for*; cash counts it when it arrived. Expenses are the paid date under both, which is
 * why they are not branched on here.
 *
 * The basis has to reach this function, not just the export: without it the table on
 * screen stayed accrual while the downloaded PDF changed, which quietly broke the page's
 * own promise that the preview is what you are about to export.
 */
function reportingDate(tx: Transaction, basis: RevenueBasis): string {
  if (tx.type !== 'revenue') return tx.date_of_payment;
  return basis === 'cash' ? tx.date_of_payment : (tx.month_for ?? tx.date_of_payment);
}

function useAllTransactionsForYear(year: number, basis: RevenueBasis) {
  return useQuery({
    // The basis is part of the key: it changes which rows belong to the year, so a cached
    // accrual result must not be reused for a cash view.
    queryKey: ['transactions', 'all-for-year', year, basis],
    queryFn: () => getAllTransactions(),
    select: (data: Transaction[]) =>
      data.filter((tx) => reportingDate(tx, basis).startsWith(String(year))),
  });
}

/** The figure shown in a cell. A month that has not happened yet stays blank rather than "—",
 *  so "nothing yet" does not read the same as "nothing happened". */
function cellText(v: number, future: boolean): string {
  return v === 0 && future ? '' : formatCell(v);
}

type MetricKey = 'rev' | 'exp' | 'net';

interface Drill {
  /** Every transaction behind this block's figures for the year. */
  txs: Transaction[];
  /** Month index (0–11) a transaction counts under, on the current basis. */
  monthOf: (tx: Transaction) => number;
  /** Property or owner name, the popover's heading. */
  title: string;
  monthLabels: string[];
}

/**
 * A figure that opens the transactions behind it. The rows are taken from the same list and
 * the same basis the figure was summed from, so they always add up to it — which the
 * Transactions page, filtering by payment date, could not promise under accrual.
 */
function DrillCell({ metric, monthIdx, drill, className, style, children }: {
  metric: MetricKey;
  monthIdx: number | null;
  drill: Drill;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  // Controlled so picking a transaction closes it: the transaction opens over this page,
  // which stays mounted underneath, and Back would otherwise find the popover still open.
  const [open, setOpen] = useState(false);
  const items = drill.txs
    .filter((tx) => metric === 'net' || tx.type === (metric === 'rev' ? 'revenue' : 'expense'))
    .filter((tx) => monthIdx === null || drill.monthOf(tx) === monthIdx)
    .sort((a, b) => a.date_of_payment.localeCompare(b.date_of_payment));
  if (items.length === 0) return <div className={className} style={style}>{children}</div>;
  const metricLabel = t(metric === 'rev' ? 'reports.revenue' : metric === 'exp' ? 'reports.expenses' : 'reports.net');
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${className} text-end hover:underline underline-offset-2 data-[state=open]:underline outline-none focus-visible:ring-2`}
          style={{ ...style, borderTop: 'none', borderBottom: 'none', borderInlineEnd: 'none', cursor: 'pointer' }}
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={i18n.dir()}
          align="center"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-[22rem] rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)' }}
        >
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
            <p className="text-[13px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{drill.title}</p>
            <p className="text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>
              {metricLabel} · {monthIdx === null ? t('reports.fullYear') : drill.monthLabels[monthIdx]} · {t('reports.txCount', { count: items.length })}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto" onClick={() => setOpen(false)}>
            {items.map((tx) => <TransactionRow key={tx.id} tx={tx} backLabel={t('reports.incomeExpense')} />)}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The Revenue / Expenses / Net trio for one property, for a whole owner while folded, and
 * for the portfolio — the same rows, so every level of the report reads the same way.
 */
function MetricRows({ monthly, totalRev, totalExp, futureFrom, drill }: {
  monthly: { rev: number; exp: number }[];
  totalRev: number;
  totalExp: number;
  /** Index of the first month that has not happened yet (12 when none). */
  futureFrom: number;
  drill: Drill;
}) {
  const { t } = useTranslation();
  const metrics: { key: MetricKey; label: string; values: number[]; total: number; color: string | null; isNet: boolean }[] = [
    { key: 'rev', label: t('reports.revenue'), values: monthly.map((m) => m.rev), total: totalRev, color: 'var(--color-rev-fg)', isNet: false },
    { key: 'exp', label: t('reports.expenses'), values: monthly.map((m) => m.exp), total: totalExp, color: 'var(--color-exp-fg)', isNet: false },
    { key: 'net', label: t('reports.net'), values: monthly.map((m) => m.rev - m.exp), total: totalRev - totalExp, color: null, isNet: true },
  ];
  return (
    <div className="flex-1 min-w-0" style={{ borderInlineStart: `2px solid ${reportTheme.gridStrong}` }}>
      {metrics.map((metric, mIdx) => (
        <div
          key={metric.key}
          className="flex items-stretch"
          style={{
            borderTop: mIdx ? `1px solid ${reportTheme.gridLight}` : undefined,
            background: metric.isNet ? reportTheme.netRowBg : undefined,
          }}
        >
          <div className={`${reportCols.metric} ps-3 py-1.5 text-[11px] ${metric.isNet ? 'font-bold' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
            {metric.label}
          </div>
          {metric.values.map((v, idx) => (
            <DrillCell
              key={idx}
              metric={metric.key}
              monthIdx={idx}
              drill={drill}
              className={`${reportCols.month} pe-2 py-1.5 text-[11.5px] ${metric.isNet ? 'font-bold' : 'font-medium'}`}
              style={{
                color: v === 0 ? 'var(--color-text-secondary)' : (metric.color ?? (v > 0 ? 'var(--color-success)' : 'var(--color-error)')),
                background: idx >= futureFrom ? reportTheme.futureColBg : 'transparent',
                fontVariantNumeric: 'tabular-nums',
                ...monthDivider('body'),
              }}
            >
              {cellText(v, idx >= futureFrom)}
            </DrillCell>
          ))}
          <DrillCell
            metric={metric.key}
            monthIdx={null}
            drill={drill}
            className={`${reportCols.total} pe-3 py-1.5 text-[12.5px] font-bold`}
            style={{
              background: metric.isNet ? reportTheme.totalColBgNet : reportTheme.totalColBg,
              borderInlineStart: `2px solid ${reportTheme.gridStrong}`,
              color: metric.color ?? (metric.total >= 0 ? 'var(--color-success)' : 'var(--color-error)'),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMoney(metric.total)}
          </DrillCell>
        </div>
      ))}
    </div>
  );
}

export function IncomeExpenseReportPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);
  // Year, basis and unfolded owners live in the URL, so coming Back from a transaction opened
  // out of a cell lands on the same view rather than a reset one.
  const [searchParams, setSearchParams] = useSearchParams();
  const updateParams = (mutate: (p: URLSearchParams) => void) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    }, { replace: true });
  const yearParam = Number(searchParams.get('year'));
  const selectedYear = years.includes(yearParam) ? yearParam : currentYear;
  const setSelectedYear = (y: number) => updateParams((p) => p.set('year', String(y)));
  // Pre-selected, never forced: the country config says which option a landlord here most
  // likely wants, and the user overrides it per report.
  const basisParam = searchParams.get('basis');
  const basis: RevenueBasis = basisParam === 'cash' || basisParam === 'accrual' ? basisParam : defaultRevenueBasis();
  const setBasis = (b: RevenueBasis) => updateParams((p) => p.set('basis', b));

  const { data: properties = [] } = useAccessibleProperties();
  const { data: transactions = [], isLoading, isError, refetch } = useAllTransactionsForYear(selectedYear, basis);
  // The preview follows the owner selection, so it stays the report you are about to export.
  const allOwners = useReportOwners();
  const ownerSelection = useOwnerSelection(allOwners);
  const includedOwners = new Set(ownerSelection.selected);
  const reportProperties = ownerSelection.isAll
    ? properties
    : properties.filter((p) => includedOwners.has(p.property_owner || ''));

  const monthsLocale = Array.from({ length: 12 }, (_, idx) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(selectedYear, idx, 1))
  );

  // Months still to come in the current year; none in a past year.
  const futureFrom = selectedYear < currentYear ? 12 : new Date().getMonth() + 1;
  const monthOf = (tx: Transaction) => Number(reportingDate(tx, basis).slice(5, 7)) - 1;
  const drillFor = (title: string, txs: Transaction[]): Drill => ({ txs, monthOf, title, monthLabels: monthsLocale });

  // Build matrix: property × month → {rev, exp}
  const rows = reportProperties.map((p) => {
    const monthly = monthsLocale.map((_, idx) => {
      const prefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const ptxs = transactions.filter((tx) => tx.property_id === p.id && reportingDate(tx, basis).startsWith(prefix));
      const rev = ptxs.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
      const exp = ptxs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      return { rev, exp };
    });
    const totalRev = monthly.reduce((s, m) => s + m.rev, 0);
    const totalExp = monthly.reduce((s, m) => s + m.exp, 0);
    const txs = transactions.filter((tx) => tx.property_id === p.id);
    return { p, monthly, totalRev, totalExp, txs };
  });

  const grand = rows.reduce((acc, r) => ({ rev: acc.rev + r.totalRev, exp: acc.exp + r.totalExp }), { rev: 0, exp: 0 });
  const grandMonthly = monthsLocale.map((_, idx) => ({
    rev: rows.reduce((s, r) => s + r.monthly[idx].rev, 0),
    exp: rows.reduce((s, r) => s + r.monthly[idx].exp, 0),
  }));

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
      monthly: monthsLocale.map((_, idx) => ({
        rev: ownerRows.reduce((s, r) => s + r.monthly[idx].rev, 0),
        exp: ownerRows.reduce((s, r) => s + r.monthly[idx].exp, 0),
      })),
      totalRev: ownerRows.reduce((s, r) => s + r.totalRev, 0),
      totalExp: ownerRows.reduce((s, r) => s + r.totalExp, 0),
      txs: ownerRows.flatMap((r) => r.txs),
      monthlyNet: monthsLocale.map((_, idx) =>
        ownerRows.reduce((s, r) => s + r.monthly[idx].rev - r.monthly[idx].exp, 0)),
      totalNet: ownerRows.reduce((s, r) => s + r.totalRev - r.totalExp, 0),
    }));
  })();

  // Owners start folded, so a many-owner portfolio opens as one line per owner. A lone owner
  // is always open: folding the only group would just hide the report behind a click.
  const expandedOwners = new Set(searchParams.getAll('owner'));
  const setExpandedOwners = (owners: Set<string>) =>
    updateParams((p) => {
      p.delete('owner');
      owners.forEach((o) => p.append('owner', o));
    });
  const canFold = ownerGroups.length > 1;
  const isOwnerOpen = (owner: string) => !canFold || expandedOwners.has(owner);
  const allOpen = ownerGroups.every((g) => isOwnerOpen(g.owner));
  const toggleOwner = (owner: string) => {
    if (!canFold) return;
    const next = new Set(expandedOwners);
    if (next.has(owner)) next.delete(owner);
    else next.add(owner);
    setExpandedOwners(next);
  };
  const toggleAllOwners = () =>
    setExpandedOwners(allOpen ? new Set() : new Set(ownerGroups.map((g) => g.owner)));

  const handleDownload = async (fmt: ReportFormat, split: boolean) => {
    setIsDownloading(fmt);
    try {
      await downloadIncomeExpenseReport(selectedYear, fmt, basis, { owners: ownerSelection.exportOwners, split });
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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('reports.incomeExpense')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('reports.calendarYear', { year: selectedYear })}
            {/* The owners belong to the report's description, next to its year: they are
                what gets exported, not just what is on screen. */}
            {!ownerSelection.isAll && <> · {ownerSelection.names}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/*
            Chosen per report, like the language, rather than stored on the account — a
            stored preference would silently re-interpret history. Pre-selected from the
            country (cash for the US, accrual elsewhere) and changeable every time, which
            is why it sits beside the download buttons rather than in Settings.
          */}
          <div className="flex items-center gap-0.5">
            <SegToggle
              size="sm"
              value={basis}
              onChange={setBasis}
              options={[
                { value: 'accrual', label: t('reports.basisAccrual') },
                { value: 'cash', label: t('reports.basisCash') },
              ]}
            />
            <InfoTip label={t('reports.basisInfoLabel')}>
              <p className="font-semibold mb-1.5">{t('reports.basisLabel')}</p>
              <p><strong>{t('reports.basisAccrual')}:</strong> {t('reports.basisAccrualHint')}</p>
              <p className="mt-1"><strong>{t('reports.basisCash')}:</strong> {t('reports.basisCashHint')}</p>
              <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.basisExample')}</p>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.basisExpensesNote')}</p>
            </InfoTip>
          </div>
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
          onChange={(v) => setSelectedYear(Number(v))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          size="sm"
        />
        <OwnerExportPicker selection={ownerSelection} />
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
            <div className="flex items-center gap-3 mb-2">
              <p className="lg:hidden text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('reports.scrollHint')}
              </p>
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
            <div className="rounded-[var(--radius-card)] overflow-hidden min-w-[1120px]" style={{ border: `1px solid ${reportTheme.gridStrong}` }}>
              {/* Header row. Padding lives inside the cells so every label sits directly above
                  the figures beneath it — see the note in reportTheme. */}
              <div className="flex items-center py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                <div className={`${reportCols.property} px-4`}>{t('reports.property')}</div>
                <div className={reportCols.metric} />
                {monthsLocale.map((m, idx) => (
                  <div key={m} className={`${reportCols.month} pe-2`} style={{ color: idx >= futureFrom ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)', ...monthDivider('header') }}>{m}</div>
                ))}
                <div className={`${reportCols.total} pe-3`} style={monthDivider('header')}>{t('reports.total')}</div>
              </div>

              {ownerGroups.map((group) => {
                const open = isOwnerOpen(group.owner);
                return (
                <div key={group.owner}>
                  {/* The owner is the top of the hierarchy, so it is the largest row. Collapsed,
                      it carries the owner's own Revenue / Expenses / Net, the same trio as a
                      property, so a folded report still reads as a summary. Open, the owner's
                      net moves to the Owner total row below, as in the PDF. */}
                  <div
                    className="flex items-stretch"
                    style={{ background: 'var(--color-rev-bg)', color: 'var(--color-text-primary)', borderTop: `2px solid ${reportTheme.gridStrong}` }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleOwner(group.owner)}
                      aria-expanded={open}
                      className={`${reportCols.property} flex items-center gap-2 px-3 py-3 text-start`}
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
                          {t('reports.propertyCount', { count: group.rows.length })}
                        </p>
                      </div>
                    </button>
                    {!open && (
                      <MetricRows
                        monthly={group.monthly}
                        totalRev={group.totalRev}
                        totalExp={group.totalExp}
                        futureFrom={futureFrom}
                        drill={drillFor(group.owner, group.txs)}
                      />
                    )}
                  </div>

                  {open && group.rows.map((r) => (
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
                      <MetricRows
                        monthly={r.monthly}
                        totalRev={r.totalRev}
                        totalExp={r.totalExp}
                        futureFrom={futureFrom}
                        drill={drillFor(r.p.address + formatFloorApartment(r.p, t), r.txs)}
                      />
                    </div>
                  ))}

                  {/* Owner total, net per month — matches the PDF's OWNER TOTAL (net) row. */}
                  {open && (
                  <div className="flex items-stretch" style={{ borderTop: `2px solid ${reportTheme.gridStrong}`, background: 'var(--color-input-filled-background)' }}>
                    <div className={`${reportCols.property} px-4 py-2.5 text-[12px] font-bold`} style={{ color: 'var(--color-text-primary)' }}>
                      {t('reports.ownerTotalNet')}
                    </div>
                    <div className={reportCols.metric} />
                    {group.monthlyNet.map((net, idx) => (
                      <DrillCell
                        key={idx}
                        metric="net"
                        monthIdx={idx}
                        drill={drillFor(group.owner, group.txs)}
                        className={`${reportCols.month} pe-2 py-2.5 text-[11.5px] font-bold`}
                        style={{
                          color: net === 0 ? 'var(--color-text-secondary)' : net > 0 ? 'var(--color-success)' : 'var(--color-error)',
                          background: idx >= futureFrom ? reportTheme.futureColBg : 'transparent',
                          fontVariantNumeric: 'tabular-nums',
                          ...monthDivider('body'),
                        }}
                      >
                        {cellText(net, idx >= futureFrom)}
                      </DrillCell>
                    ))}
                    <DrillCell
                      metric="net"
                      monthIdx={null}
                      drill={drillFor(group.owner, group.txs)}
                      className={`${reportCols.total} pe-3 py-2.5 text-[13px] font-bold`}
                      style={{
                        background: reportTheme.totalColBgNet,
                        borderInlineStart: `2px solid ${reportTheme.gridStrong}`,
                        color: group.totalNet >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(group.totalNet)}
                    </DrillCell>
                  </div>
                  )}
                </div>
                );
              })}

              {/* Portfolio total: every owner together, month by month. With a single owner
                  it would repeat that owner's figures, so it only appears for two or more. */}
              {ownerGroups.length > 1 && (
                <div className="flex items-stretch" style={{ borderTop: `3px solid ${reportTheme.gridStrong}` }}>
                  <div
                    className={`${reportCols.property} flex items-center px-4 py-3 text-[14.5px] font-bold`}
                    style={{ background: 'var(--color-brand-navy)', color: '#fff' }}
                  >
                    {t('reports.portfolioTotal')}
                  </div>
                  <MetricRows
                    monthly={grandMonthly}
                    totalRev={grand.rev}
                    totalExp={grand.exp}
                    futureFrom={futureFrom}
                    drill={drillFor(
                      t('reports.portfolioTotal'),
                      ownerSelection.isAll ? transactions : rows.flatMap((r) => r.txs),
                    )}
                  />
                </div>
              )}
            </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
