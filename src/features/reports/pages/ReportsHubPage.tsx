import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart2, List, FileText, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReportHistory, deleteReportExport } from '../api/reports';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';
import { ArrowRight } from 'lucide-react';

function useReportHistory() {
  return useQuery({ queryKey: ['reports', 'history'], queryFn: getReportHistory });
}

function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReportExport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'history'] }),
  });
}

export function ReportsHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: history = [], isLoading } = useReportHistory();
  const { mutateAsync: deleteReport } = useDeleteReport();
  const { showToast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm(t('reports.deleteConfirm'))) return;
    try {
      await deleteReport(id);
      showToast(t('reports.deleteSuccess'), 'success');
    } catch {
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  const reportCards = [
    {
      icon: BarChart2,
      title: t('reports.incomeExpense'),
      subtitle: t('reports.incomeExpenseDescription'),
      color: 'var(--color-success)',
      path: '/reports/income-expense',
    },
    {
      icon: List,
      title: t('reports.expenseLog'),
      subtitle: t('reports.expenseLogDescription'),
      color: 'var(--color-error)',
      path: '/reports/expense-log',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.reports')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.hubSubtitle')}</p>
      </div>

      {/* Report type cards */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.generateSection')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {reportCards.map((card) => (
            <div
              key={card.path}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]" style={{ background: card.color, color: '#fff' }}>
                  <card.icon size={22} />
                </div>
                <div>
                  <p className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>{card.title}</p>
                  <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{card.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(card.path)}
                className="flex items-center justify-center gap-1.5 h-9 w-full rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-primary)' }}
              >
                {t('reports.openReport')} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Export history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.recentReports')}</p>
          <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.savedCount', { count: history.length })}</span>
        </div>
        {isLoading ? <PageLoader /> : history.length === 0 ? (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.noHistory')}</p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            {history.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--color-outline)' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: item.format === 'pdf' ? 'var(--color-exp-bg)' : 'var(--color-rev-bg)', color: item.format === 'pdf' ? 'var(--color-exp-fg)' : 'var(--color-rev-fg)' }}>
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {item.report_type === 'income_expense' ? t('reports.incomeExpense') : t('reports.expenseLog')} · {item.year}
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('reports.generatedMeta', { date: new Date(item.created_at).toLocaleDateString(), format: item.format.toUpperCase() })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--color-error)]/10"
                  style={{ color: 'var(--color-error)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
