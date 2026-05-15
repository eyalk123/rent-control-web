import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart2, List, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReportHistory, deleteReportExport } from '../api/reports';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';

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
    if (!confirm(t('reports.deleteConfirm', 'Delete this report?'))) return;
    try {
      await deleteReport(id);
      showToast(t('reports.deleteSuccess', 'Report deleted'), 'success');
    } catch {
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  const reportCards = [
    {
      icon: BarChart2,
      title: t('reports.incomeExpense', 'Income & Expense'),
      description: t('reports.incomeExpenseDesc', 'Annual income vs. expenses summary'),
      path: '/reports/income-expense',
    },
    {
      icon: List,
      title: t('reports.expenseLog', 'Expense Log'),
      description: t('reports.expenseLogDesc', 'Detailed log of all expenses'),
      path: '/reports/expense-log',
    },
  ];

  return (
    <PageContainer>
      <h1 className="mb-5 text-xl font-bold text-[var(--color-text-primary)]">{t('screens.reports')}</h1>

      {/* Report type cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {reportCards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="flex items-start gap-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 text-start hover:bg-[var(--color-input-bg)] transition-colors"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
              <card.icon size={22} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{card.title}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Export history */}
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
        {t('reports.history', 'Export History')}
      </h2>
      {isLoading ? <PageLoader /> : history.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('reports.noHistory', 'No exports yet')}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
          {history.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {item.report_type === 'income_expense' ? t('reports.incomeExpense', 'Income & Expense') : t('reports.expenseLog', 'Expense Log')} — {item.year}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {item.format.toUpperCase()} · {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
