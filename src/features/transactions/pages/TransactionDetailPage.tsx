import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Trash2, Building2, User, Store, Tag, CreditCard, Calendar, FileText, Receipt } from 'lucide-react';
import { useTransaction, useDeleteTransaction } from '../queries';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Pill } from '@/shared/components/ui/Pill';
import { formatMoney } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
      <Icon size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
      <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}


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
  const tintBg = isRevenue ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)';
  const tintFg = isRevenue ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)';

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={14} /> {t('transactions.allTransactions')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/transactions/${txId}/edit`)} className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium" style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'transparent' }}>
            <Trash2 size={14} /> {t('common.delete')}
          </button>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Left: tinted hero card */}
        <div className="rounded-[var(--radius-card)] p-8 flex flex-col items-center justify-center gap-4" style={{ background: tintBg, border: '1px solid var(--color-outline)' }}>
          <Pill tone={isRevenue ? 'revenue' : 'expense'} size="md">{isRevenue ? t('transactions.revenue') : t('transactions.expense')}</Pill>
          <LtrSpan className="text-[56px] font-bold leading-none" style={{ color: tintFg, fontVariantNumeric: 'tabular-nums' }}>
            {isRevenue ? '+' : '−'}{formatMoney(tx.amount)}
          </LtrSpan>
          <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
            {isRevenue ? (tx.renter_name ?? tx.property_name) : (tx.supplier_name ?? tx.category_name ?? '—')}
          </p>
          {tx.notes && (
            <p className="text-[13px] text-center max-w-[280px] mt-2 leading-relaxed italic" style={{ color: 'var(--color-text-secondary)' }}>"{tx.notes}"</p>
          )}
        </div>

        {/* Right: details panel */}
        <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <header className="px-5 py-3.5 text-[14px] font-bold" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-outline)' }}>
            {t('transactions.detailsPanel')}
          </header>
          <DetailRow icon={Building2} label={t('transactions.propertyLabel')} value={tx.property_name} />
          {isRevenue && <DetailRow icon={User} label={t('transactions.renterLabel')} value={tx.renter_name} />}
          {!isRevenue && <DetailRow icon={Store} label={t('transactions.supplierLabel')} value={tx.supplier_name} />}
          {!isRevenue && <DetailRow icon={Tag} label={t('transactions.categoryLabel')} value={tx.category_name} />}
          <DetailRow icon={CreditCard} label={t('transactions.paymentMethodLabel')} value={tx.payment_method ? t(`transactions.paymentMethod_${tx.payment_method}`, { defaultValue: tx.payment_method }) : null} />
          {isRevenue && tx.month_for && <DetailRow icon={Calendar} label={t('transactions.monthForLabel2')} value={tx.month_for} />}
          <DetailRow icon={Calendar} label={t('transactions.dateOfPaymentLabel')} value={tx.date_of_payment} />
          {tx.notes && <DetailRow icon={FileText} label={t('transactions.notesLabel')} value={tx.notes} />}

          {/* Receipt placeholder */}
          <div className="p-4" style={{ borderTop: '1px solid var(--color-outline)' }}>
            <div className="rounded-[12px] p-8 flex flex-col items-center gap-2" style={{ border: '1.5px dashed var(--color-outline)' }}>
              <Receipt size={24} style={{ color: 'var(--color-text-secondary)' }} />
              <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('transactions.noReceipt')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
