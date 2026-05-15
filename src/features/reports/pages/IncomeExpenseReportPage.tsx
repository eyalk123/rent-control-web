import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download } from 'lucide-react';
import { downloadIncomeExpenseReport, type ReportFormat } from '../api/reports';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';

export function IncomeExpenseReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [isDownloading, setIsDownloading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadIncomeExpenseReport(selectedYear, selectedFormat);
      showToast(t('reports.downloadSuccess', 'Report downloaded'), 'success');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageContainer>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={16} />{t('common.back')}
      </button>
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">{t('reports.incomeExpense', 'Income & Expense')}</h1>

      <div className="max-w-md space-y-6">
        {/* Year selector */}
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{t('reports.selectYear', 'Select Year')}</p>
          <div className="flex flex-wrap gap-2">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${selectedYear === y ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Format selector */}
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{t('reports.selectFormat', 'Select Format')}</p>
          <div className="flex gap-2">
            {(['pdf', 'csv'] as ReportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold uppercase transition-colors ${selectedFormat === fmt ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Download size={16} />
          {isDownloading ? t('reports.generating', 'Generating...') : t('reports.download', 'Download Report')}
        </button>
      </div>
    </PageContainer>
  );
}
