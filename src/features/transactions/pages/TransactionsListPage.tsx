import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Wallet, Trash2, Store } from 'lucide-react';
import { useTransactions, useDeleteTransaction, useTransactionSummary } from '../queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/Toast';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import type { Transaction } from '@/shared/types';

type Filter = 'all' | 'revenue' | 'expense';

function groupByMonth(txs: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = tx.date_of_payment.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return map;
}

export function TransactionsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { mutateAsync: deleteTransaction } = useDeleteTransaction();
  const { showToast } = useToast();
  const selectionMode = selectedIds.size > 0;

  const queryFilters = filter === 'all' ? {} : { type: filter as 'revenue' | 'expense' };
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTransactions(queryFilters);
  const { data: summary } = useTransactionSummary();

  const transactions = data?.pages.flat() ?? [];
  const grouped = groupByMonth(transactions);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    observerRef.current.observe(node);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkDelete = async () => {
    if (!confirm(t('bulkDelete.confirm', { count: selectedIds.size }))) return;
    try {
      await Promise.all([...selectedIds].map((id) => deleteTransaction(id)));
      setSelectedIds(new Set());
      showToast(t('bulkDelete.success'), 'success');
    } catch { showToast(t('error.deleteFailed'), 'error'); }
  };

  const heroBucket = summary?.six_month_buckets?.at(-1);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('screens.transactions')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/suppliers')} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]"><Store size={14} />{t('screens.suppliers')}</button>
          {selectionMode ? (
            <>
              <button onClick={() => setSelectedIds(new Set())} className="rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)]">{t('common.cancel')}</button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-error)]/10 px-3 py-2 text-sm font-medium text-[var(--color-error)]"><Trash2 size={14} />{t('bulkDelete.delete', { count: selectedIds.size })}</button>
            </>
          ) : (
            <button onClick={() => navigate('/transactions/add')} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus size={16} />{t('transactions.addNew')}</button>
          )}
        </div>
      </div>

      {/* Summary hero */}
      {heroBucket && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: t('transactions.revenue'), value: formatMoney(heroBucket.revenue), color: 'var(--color-rev-fg)', bg: 'var(--color-rev-bg)' },
            { label: t('transactions.expenses'), value: formatMoney(heroBucket.expenses), color: 'var(--color-exp-fg)', bg: 'var(--color-exp-bg)' },
            { label: t('transactions.profit'), value: formatMoney(heroBucket.profit), color: heroBucket.profit >= 0 ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', bg: 'var(--color-outline)' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: s.bg }}>
              <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
              <LtrSpan className="text-lg font-bold mt-1" style={{ color: s.color }}>{s.value}</LtrSpan>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-4 flex gap-2">
        {(['all', 'revenue', 'expense'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
          >
            {t(`transactions.filter_${f}` as never, f)}
          </button>
        ))}
      </div>

      {isLoading ? <PageLoader /> : transactions.length === 0 ? (
        <EmptyState icon={Wallet} title={t('empty.transactions')} action={<button onClick={() => navigate('/transactions/add')} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus size={14} />{t('transactions.addNew')}</button>} />
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([month, txs]) => (
            <div key={month}>
              <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{month}</p>
              <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
                {txs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={selectionMode ? () => toggleSelect(tx.id) : () => navigate(`/transactions/${tx.id}`)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-[var(--color-input-bg)] ${selectedIds.has(tx.id) ? 'bg-[var(--color-primary)]/5' : ''}`}
                  >
                    {selectionMode && <input type="checkbox" checked={selectedIds.has(tx.id)} onChange={() => toggleSelect(tx.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 accent-[var(--color-primary)]" />}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tx.type === 'revenue' ? 'bg-[var(--color-rev-bg)]' : 'bg-[var(--color-exp-bg)]'}`}>
                      <Wallet size={14} style={{ color: tx.type === 'revenue' ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{tx.property_name ?? '—'}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{tx.renter_name ?? tx.category_name ?? '—'} · {tx.date_of_payment}</p>
                    </div>
                    <LtrSpan className={`text-sm font-semibold shrink-0 ${tx.type === 'revenue' ? 'text-[var(--color-rev-fg)]' : 'text-[var(--color-exp-fg)]'}`}>
                      {tx.type === 'revenue' ? '+' : '-'}{formatMoney(tx.amount)}
                    </LtrSpan>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="py-2 text-center">
            {isFetchingNextPage && <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent mx-auto" />}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
