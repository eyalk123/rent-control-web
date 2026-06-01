import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { TransactionRow } from '@/shared/components/detail/TransactionRow';
import type { Transaction } from '@/shared/types';

interface Props {
  transactions: Transaction[];
}

export function RenterTransactionsTab({ transactions }: Props) {
  const { t } = useTranslation();

  if (transactions.length === 0) {
    return <EmptyState icon={undefined} title={t('renter.noTransactionsYet')} />;
  }

  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      {transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
    </div>
  );
}
