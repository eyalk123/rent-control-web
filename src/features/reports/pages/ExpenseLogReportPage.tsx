import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { downloadExpenseLogReport, type ReportFormat } from '../api/reports';
import { getTransactions } from '@/features/transactions/api/transactions';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

function useExpensesForYear(year: number) {
  return useQuery({
    queryKey: ['transactions', 'expenses-for-year', year],
    queryFn: () => getTransactions({ type: 'expense', limit: 2000, offset: 0 }),
    select: (data: Transaction[]) => data.filter((tx) => tx.date_of_payment.startsWith(String(year))),
  });
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function ExpenseLogReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);

  const { data: expenses = [], isLoading } = useExpensesForYear(selectedYear);

  // Group by category
  const categoryMap = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = tx.category_name ?? 'Uncategorized';
    if (!categoryMap.has(key)) categoryMap.set(key, []);
    categoryMap.get(key)!.push(tx);
  }
  const categories = [...categoryMap.entries()].sort((a, b) => b[1].reduce((s, t) => s + t.amount, 0) - a[1].reduce((s, t) => s + t.amount, 0));
  const total = expenses.reduce((s, tx) => s + tx.amount, 0);

  const handleDownload = async (fmt: ReportFormat) => {
    setIsDownloading(fmt);
    try {
      await downloadExpenseLogReport(selectedYear, fmt);
      showToast(t('reports.downloadSuccess', 'Report downloaded'), 'success');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1 text-[12px] font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronLeft size={14} /> Reports
          </button>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Expense Log</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {expenses.length} expenses · <LtrSpan>{formatMoney(total)}</LtrSpan> total
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
      <div className="flex items-center gap-4 px-8 py-3.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Year</span>
        <SegToggle
          value={String(selectedYear)}
          onChange={(v) => setSelectedYear(Number(v))}
          options={years.slice(0, 3).map((y) => ({ value: String(y), label: String(y) }))}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <PageLoader />
        ) : expenses.length === 0 ? (
          <EmptyState icon={undefined} title="No expenses found" description={`No expenses recorded for ${selectedYear}.`} />
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
            {/* Main table */}
            <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
              {/* Header */}
              <div className="flex items-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                <div className="w-[90px]">Date</div>
                <div className="flex-[1.5]">Supplier / category</div>
                <div className="flex-1">Property</div>
                <div className="w-[90px] text-right">Amount</div>
              </div>

              {categories.map(([catName, txs]) => {
                const catTotal = txs.reduce((s, tx) => s + tx.amount, 0);
                return (
                  <div key={catName}>
                    {/* Category header */}
                    <div className="flex items-center px-4 py-2.5" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)', borderBottom: '1px solid var(--color-outline)' }}>
                      <div className="flex-1 text-[12.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{catName}</div>
                      <LtrSpan className="text-[12.5px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(catTotal)}</LtrSpan>
                    </div>
                    {/* Rows */}
                    {txs.map((tx, i) => (
                      <div key={tx.id} className="flex items-center px-4 py-2.5" style={{ borderBottom: i === txs.length - 1 ? 'none' : '1px solid var(--color-outline)' }}>
                        <div className="w-[90px] text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(tx.date_of_payment)}</div>
                        <div className="flex-[1.5] min-w-0">
                          <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tx.supplier_name ?? tx.category_name ?? '—'}</p>
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
                <div className="flex-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Grand total</div>
                <LtrSpan className="text-[16px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
              </div>
            </div>

            {/* Right sidebar: % breakdown */}
            <div className="flex flex-col gap-3">
              <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>By category</p>
                <div className="flex flex-col gap-3">
                  {categories.map(([catName, txs]) => {
                    const catTotal = txs.reduce((s, tx) => s + tx.amount, 0);
                    const pct = total > 0 ? (catTotal / total) * 100 : 0;
                    return (
                      <div key={catName}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{catName}</span>
                          <span className="text-[11.5px] font-semibold ml-2 shrink-0" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
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
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Total expenses</p>
                <LtrSpan className="text-[24px] font-bold mt-1 block" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</LtrSpan>
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{expenses.length} transactions · {categories.length} categories</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
