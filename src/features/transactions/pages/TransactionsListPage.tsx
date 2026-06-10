import { useRef, useCallback, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { translateCategory } from '@/shared/utils/categories';
import i18n from '@/core/i18n';
import { Plus, TrendingUp, TrendingDown, CheckSquare } from 'lucide-react';
import { useTransactions, useTransactionSummary, transactionKeys } from '../queries';
import { deleteTransaction } from '../api/transactions';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { CashFlowChart } from '@/shared/components/ui/CashFlowChart';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { TransactionFormDrawer } from './TransactionFormDrawer';
import { SelectionToolbar } from '@/shared/components/ui/SelectionToolbar';
import { TriStateCheckbox } from '@/shared/components/ui/TriStateCheckbox';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useSelectMode } from '@/hooks/useSelectMode';
import { useLongPress } from '@/hooks/useLongPress';
import type { Transaction } from '@/shared/types';

// ─── helpers ────────────────────────────────────────────────────────────────

type Filter = 'all' | 'revenue' | 'expense';

function groupByMonth(txs: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = tx.date_of_payment.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return map;
}

function fmtMonthKey(key: string): string {
  const [y, m] = key.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(date);
}

// ─── TxRow ───────────────────────────────────────────────────────────────────

interface TxRowProps {
  tx: Transaction;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onLongPress: (id: number) => void;
}

function TxRow({ tx, isSelectMode, isSelected, onToggle, onLongPress }: TxRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRev = tx.type === 'revenue';
  const longPress = useLongPress(() => onLongPress(tx.id));

  const activate = () => {
    if (isSelectMode) onToggle(tx.id);
    else navigate(`/transactions/${tx.id}`);
  };

  return (
    <button
      onClick={activate}
      {...longPress}
      className="flex items-center gap-3 w-full px-4 py-3 text-start transition-colors hover:bg-[var(--color-input-filled-background)]"
      style={{ borderBottom: '1px solid var(--color-outline)', background: isSelected ? 'var(--color-input-filled-background)' : undefined }}
    >
      {isSelectMode ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <TriStateCheckbox checked={isSelected} />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: isRev ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)', color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}>
          {isRev ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {isRev ? (tx.renter_name ?? tx.property_name) : (tx.supplier_name ?? (tx.category_name ? translateCategory(tx.category_name, t) : '—'))}
        </p>
        <p className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {isRev ? t('transactions.rentLabel') : translateCategory(tx.category_name, t)} · {tx.property_name} · {tx.date_of_payment}
        </p>
      </div>
      <LtrSpan className="text-[13.5px] font-semibold shrink-0" style={{ color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
        {isRev ? '+' : '−'}{formatMoney(tx.amount)}
      </LtrSpan>
    </button>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function TransactionsListPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTxType, setInitialTxType] = useState<'revenue' | 'expense' | undefined>(undefined);

  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'revenue' || newParam === 'expense') {
      setInitialTxType(newParam);
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: consume the ?new query param once
  }, []);

  const queryFilters = filter === 'all' ? {} : { type: filter as 'revenue' | 'expense' };
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTransactions(queryFilters);
  const { data: summary, isLoading: summaryLoading } = useTransactionSummary();

  const transactions = data?.pages.flat() ?? [];
  const filtered = search
    ? transactions.filter((tx) => `${tx.renter_name ?? ''} ${tx.supplier_name ?? ''} ${tx.category_name ?? ''} ${tx.property_name}`.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  const qc = useQueryClient();
  const sel = useSelectMode({
    items: filtered,
    deleteItem: deleteTransaction,
    onDeleted: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });

  const grouped = groupByMonth(filtered);
  const months = [...grouped.keys()].sort().reverse();

  const buckets = (summary?.six_month_buckets ?? []).map((b) => ({
    month: `${String(b.month).padStart(2, '0')}/${b.year}`,
    revenue: b.revenue,
    expenses: b.expenses,
  }));
  const lastBucket = summary?.six_month_buckets?.at(-1);

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    observerRef.current.observe(node);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 gap-y-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.transactions')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {isLoading
              ? <Skeleton width={160} height={14} />
              : t('transactions.headerMeta', { count: filtered.length })}
          </p>
        </div>
        {sel.isSelectMode ? (
          <div className="flex-1 min-w-[260px]">
            <SelectionToolbar
              allSelected={sel.allSelected}
              someSelected={sel.someSelected}
              selectedCount={sel.selectedCount}
              deleting={sel.deleting}
              onToggleAll={sel.toggleAll}
              onDelete={sel.requestDelete}
              onCancel={sel.cancel}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => sel.enter()}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              <CheckSquare size={14} /> {t('common.select')}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> {t('transactions.addTransactionBtn')}
            </button>
          </div>
        )}
      </div>

      {/* Hero: chart + KPI tiles */}
      {summaryLoading ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[var(--radius-card)] p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1.5">
                <Skeleton width={120} height={14} className="block" />
                <Skeleton width={80} height={11} className="block" />
              </div>
            </div>
            <Skeleton className="block w-full" height={180} />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[var(--radius-md)] p-4 flex-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <Skeleton width="60%" height={11} className="block" />
                <Skeleton width="50%" height={22} className="block mt-2" />
              </div>
            ))}
          </div>
        </div>
      ) : buckets.length > 0 && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
          {/* Chart card */}
          <div className="rounded-[var(--radius-card)] p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[14px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('transactions.revVsExpense')}</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('transactions.last6Months')}</p>
              </div>
              <div className="flex gap-3.5 text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--color-success)' }} /> {t('transactions.revenue')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--color-error)' }} /> {t('transactions.expense')}
                </span>
              </div>
            </div>
            <CashFlowChart data={buckets} height={180} />
          </div>

          {/* KPI tiles */}
          <div className="flex flex-col gap-3">
            {lastBucket && (() => {
              const profit = lastBucket.profit ?? (lastBucket.revenue - lastBucket.expenses);
              return [
                { label: t('transactions.thisMonthRevenue'), value: lastBucket.revenue, tone: 'success' as const },
                { label: t('transactions.thisMonthExpenses'), value: lastBucket.expenses, tone: 'danger' as const },
                { label: t('transactions.thisMonthNet'), value: profit, tone: profit >= 0 ? 'success' as const : 'danger' as const },
              ];
            })().map(({ label, value, tone }) => (
              <div key={label} className="rounded-[var(--radius-md)] p-4 flex-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                <LtrSpan className="text-[22px] font-bold mt-1 block" style={{ color: tone === 'success' ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(value)}
                </LtrSpan>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <SegToggle
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: 'all', label: t('transactions.filterAll') },
            { value: 'revenue', label: t('transactions.filterRevenue') },
            { value: 'expense', label: t('transactions.filterExpense') },
          ]}
          size="sm"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('transactions.searchPlaceholder')}
          className="h-9 rounded-[9px] px-3 text-sm flex-1 min-w-[200px] max-w-[300px] outline-none"
          style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={undefined}
          title={search || filter !== 'all' ? t('empty.noResults') : t('empty.transactions')}
          action={
            !search && filter === 'all' ? (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Plus size={14} /> {t('transactions.addNew')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {months.map((month) => {
            const txs = grouped.get(month)!;
            const mRev = txs.filter((tx) => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0);
            const mExp = txs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
            return (
              <div key={month}>
                {/* Month header */}
                <div className="flex items-center justify-between px-1.5 pb-2.5">
                  <p className="text-[13.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmtMonthKey(month)}</p>
                  <div className="flex gap-4 text-[12px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <LtrSpan style={{ color: 'var(--color-rev-fg)' }}>+{formatMoney(mRev)}</LtrSpan>
                    <LtrSpan style={{ color: 'var(--color-exp-fg)' }}>−{formatMoney(mExp)}</LtrSpan>
                  </div>
                </div>
                {/* Transaction list */}
                <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
                  {txs.map((tx) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      isSelectMode={sel.isSelectMode}
                      isSelected={sel.selectedIds.has(tx.id)}
                      onToggle={sel.toggle}
                      onLongPress={sel.enter}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div ref={loaderRef} className="py-2 text-center">
            {isFetchingNextPage && <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent mx-auto" />}
          </div>
        </div>
      )}

      <TransactionFormDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setInitialTxType(undefined); }} initialType={initialTxType} />
      <ConfirmDialog
        open={sel.confirmOpen}
        title={t('bulkDelete.deleteConfirmTitle', { count: sel.selectedCount })}
        message={t('bulkDelete.deleteConfirmMessage')}
        loading={sel.deleting}
        onConfirm={sel.performDelete}
        onClose={() => sel.setConfirmOpen(false)}
      />
    </div>
  );
}
