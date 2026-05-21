import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { downloadIncomeExpenseReport, type ReportFormat } from '../api/reports';
import { getTransactions } from '@/features/transactions/api/transactions';
import { useProperties } from '@/features/properties/queries';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { PropTile } from '@/shared/components/ui/PropTile';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { formatMoney } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';
import type { Transaction } from '@/shared/types';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatK(v: number): string {
  if (v === 0) return '—';
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

function useAllTransactionsForYear(year: number) {
  return useQuery({
    queryKey: ['transactions', 'all-for-year', year],
    queryFn: () => getTransactions({ limit: 2000, offset: 0 }),
    select: (data: Transaction[]) => data.filter((tx) => tx.date_of_payment.startsWith(String(year))),
  });
}

export function IncomeExpenseReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null);

  const { data: properties = [] } = useProperties();
  const { data: transactions = [], isLoading } = useAllTransactionsForYear(selectedYear);

  // Build matrix: property × month → {rev, exp}
  const rows = properties.map((p) => {
    const monthly = MONTHS_SHORT.map((_, idx) => {
      const prefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const ptxs = transactions.filter((tx) => tx.property_id === p.id && tx.date_of_payment.startsWith(prefix));
      const rev = ptxs.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
      const exp = ptxs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      return { rev, exp };
    });
    const totalRev = monthly.reduce((s, m) => s + m.rev, 0);
    const totalExp = monthly.reduce((s, m) => s + m.exp, 0);
    return { p, monthly, totalRev, totalExp };
  });

  const grand = rows.reduce((acc, r) => ({ rev: acc.rev + r.totalRev, exp: acc.exp + r.totalExp }), { rev: 0, exp: 0 });

  const handleDownload = async (fmt: ReportFormat) => {
    setIsDownloading(fmt);
    try {
      await downloadIncomeExpenseReport(selectedYear, fmt);
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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Income & Expense</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Calendar year {selectedYear}</p>
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
        <div className="ml-auto flex gap-6">
          {[
            { label: 'Revenue', value: grand.rev, color: 'var(--color-rev-fg)' },
            { label: 'Expenses', value: grand.exp, color: 'var(--color-exp-fg)' },
            { label: 'Net', value: grand.rev - grand.exp, color: grand.rev - grand.exp >= 0 ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
              <LtrSpan className="text-[14px] font-bold mt-0.5" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value)}</LtrSpan>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix table */}
      <div className="px-8 py-6">
        {isLoading ? <PageLoader /> : (
          <>
            <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
              {/* Header row */}
              <div className="flex items-center px-4 py-3 gap-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--color-brand-navy)', color: '#fff' }}>
                <div className="flex-[2.4] min-w-0">Property</div>
                {MONTHS_SHORT.map((m) => <div key={m} className="w-12 text-right" style={{ color: 'rgba(255,255,255,0.7)' }}>{m}</div>)}
                <div className="w-20 text-right">Total</div>
              </div>

              {/* Revenue group */}
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--color-rev-bg)', color: 'var(--color-rev-fg)', borderBottom: '1px solid var(--color-outline)' }}>Revenue</div>
              {rows.map((r) => (
                <div key={`rev-${r.p.id}`} className="flex items-center px-4 py-2.5 gap-1" style={{ borderBottom: '1px solid var(--color-outline)' }}>
                  <div className="flex-[2.4] min-w-0 flex items-center gap-2.5">
                    <PropTile propertyId={r.p.id} size={28} />
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.p.address}</p>
                      {r.p.property_owner && <p className="text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>{r.p.property_owner}</p>}
                    </div>
                  </div>
                  {r.monthly.map((m, idx) => (
                    <div key={idx} className="w-12 text-right text-[11.5px] font-medium" style={{ color: m.rev ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatK(m.rev)}
                    </div>
                  ))}
                  <div className="w-20 text-right text-[13px] font-bold" style={{ color: 'var(--color-rev-fg)', fontVariantNumeric: 'tabular-nums' }}>{r.totalRev > 0 ? formatMoney(r.totalRev) : '—'}</div>
                </div>
              ))}

              {/* Expenses group */}
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--color-exp-bg)', color: 'var(--color-exp-fg)', borderTop: '1px solid var(--color-outline)', borderBottom: '1px solid var(--color-outline)' }}>Expenses</div>
              {rows.map((r) => (
                <div key={`exp-${r.p.id}`} className="flex items-center px-4 py-2.5 gap-1" style={{ borderBottom: '1px solid var(--color-outline)' }}>
                  <div className="flex-[2.4] min-w-0 flex items-center gap-2.5">
                    <PropTile propertyId={r.p.id} size={28} />
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.p.address}</p>
                      {r.p.property_owner && <p className="text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>{r.p.property_owner}</p>}
                    </div>
                  </div>
                  {r.monthly.map((m, idx) => (
                    <div key={idx} className="w-12 text-right text-[11.5px] font-medium" style={{ color: m.exp ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatK(m.exp)}
                    </div>
                  ))}
                  <div className="w-20 text-right text-[13px] font-bold" style={{ color: 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>{r.totalExp > 0 ? formatMoney(r.totalExp) : '—'}</div>
                </div>
              ))}

              {/* Net totals row */}
              <div className="flex items-center px-4 py-3.5 gap-1" style={{ background: 'var(--color-input-filled-background)', borderTop: '1px solid var(--color-outline)' }}>
                <div className="flex-[2.4] text-[13.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Net total</div>
                {MONTHS_SHORT.map((_, idx) => {
                  const net = rows.reduce((s, r) => s + r.monthly[idx].rev - r.monthly[idx].exp, 0);
                  return (
                    <div key={idx} className="w-12 text-right text-[11.5px] font-bold" style={{ color: net === 0 ? 'var(--color-text-secondary)' : net > 0 ? 'var(--color-success)' : 'var(--color-error)', fontVariantNumeric: 'tabular-nums' }}>
                      {net === 0 ? '—' : formatK(net)}
                    </div>
                  );
                })}
                <div className="w-20 text-right text-[14px] font-bold" style={{ color: grand.rev - grand.exp >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(grand.rev - grand.exp)}
                </div>
              </div>
            </div>

            {/* Per-property summary cards */}
            <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {rows.map((r) => (
                <div key={r.p.id} className="rounded-[var(--radius-md)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <PropTile propertyId={r.p.id} size={32} />
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.p.address}</p>
                      {r.p.property_owner && <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{r.p.property_owner}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between pt-2.5" style={{ borderTop: '1px solid var(--color-outline)' }}>
                    {[
                      { label: 'Rev', value: r.totalRev, color: 'var(--color-rev-fg)' },
                      { label: 'Exp', value: r.totalExp, color: 'var(--color-exp-fg)' },
                      { label: 'Net', value: r.totalRev - r.totalExp, color: 'var(--color-text-primary)' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                        <LtrSpan className="text-[13px] font-bold mt-0.5 block" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value)}</LtrSpan>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
