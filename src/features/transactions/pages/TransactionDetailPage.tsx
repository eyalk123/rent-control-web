import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { useTransaction, useDeleteTransaction } from '../queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';

export function TransactionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const txId = Number(id);
  const { data: tx, isLoading } = useTransaction(txId);
  const { mutateAsync: deleteTx } = useDeleteTransaction();
  const { showToast } = useToast();

  const handleDelete = async () => {
    if (!confirm(t('transactions.deleteConfirm'))) return;
    try {
      await deleteTx(txId);
      showToast(t('transactions.deleteSuccess'), 'success');
      navigate('/transactions', { replace: true });
    } catch { showToast(t('error.deleteFailed'), 'error'); }
  };

  if (isLoading) return <PageLoader />;
  if (!tx) return null;

  const isRevenue = tx.type === 'revenue';

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
          <ChevronLeft size={16} />{t('common.back')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/transactions/${txId}/edit`)} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]">
            <Pencil size={14} />{t('common.edit')}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-error)]/30 px-3 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10">
            <Trash2 size={14} />{t('common.delete')}
          </button>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Amount card */}
        <div className={`rounded-2xl p-6 flex flex-col items-center gap-1 ${isRevenue ? 'bg-[var(--color-rev-bg)]' : 'bg-[var(--color-exp-bg)]'}`}>
          <p className="text-xs font-medium" style={{ color: isRevenue ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}>
            {t(`transactions.${tx.type}`)}
          </p>
          <LtrSpan className="text-3xl font-bold" style={{ color: isRevenue ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}>
            {isRevenue ? '+' : '-'}{formatMoney(tx.amount)}
          </LtrSpan>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 space-y-3">
          {[
            { label: t('transactions.property'), value: tx.property_name },
            { label: t('transactions.renter'), value: tx.renter_name },
            { label: t('transactions.category'), value: tx.category_name },
            { label: t('transactions.supplier'), value: tx.supplier_name },
            { label: t('transactions.date'), value: tx.date_of_payment },
            { label: t('transactions.monthFor'), value: tx.month_for },
            { label: t('transactions.paymentMethod'), value: tx.payment_method },
            { label: t('transactions.notes'), value: tx.notes },
          ].filter((r) => r.value).map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <span className="text-sm text-[var(--color-text-secondary)] w-32 shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)] break-words">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
