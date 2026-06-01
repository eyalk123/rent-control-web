import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { translateCategory } from '@/shared/utils/categories';
import type { Transaction } from '@/shared/types';

interface Props {
  tx: Transaction;
}

export function TransactionRow({ tx }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRev = tx.type === 'revenue';
  return (
    <button
      onClick={() => navigate(`/transactions/${tx.id}`)}
      className="flex items-center gap-3 w-full px-4 py-3 text-start transition-colors hover:bg-[var(--color-input-filled-background)]"
      style={{ borderBottom: '1px solid var(--color-outline)' }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: isRev ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)', color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)' }}>
        {isRev ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {isRev ? tx.renter_name : (tx.supplier_name ?? (tx.category_name ? translateCategory(tx.category_name, t) : '—'))}
        </p>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRev ? t('property.rent') : translateCategory(tx.category_name, t)} · {fmtDate(tx.date_of_payment)}
        </p>
      </div>
      <LtrSpan className="text-[13.5px] font-semibold shrink-0" style={{ color: isRev ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)', fontVariantNumeric: 'tabular-nums' }}>
        {isRev ? '+' : '−'}{formatMoney(tx.amount)}
      </LtrSpan>
    </button>
  );
}
