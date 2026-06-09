import { useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/shared/utils/money';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useToast } from '@/shared/components/ui/Toast';
import { useCreateRevenueTransaction } from '@/features/transactions/queries';
import { useAlertsPanel } from '@/features/alerts/AlertsPanelContext';
import type { PaymentMethod } from '@/shared/types';
import type { OverdueRenter, ExpiringRenter } from '../api/homeApi';

interface Props {
  overdueRenters: OverdueRenter[];
  expiringRenters: ExpiringRenter[];
  loading?: boolean;
}

function mapPaymentType(type?: string | null): PaymentMethod {
  if (type === 'wire_transfer') return 'bank_transfer';
  if (type === 'bit') return 'bit';
  if (type === 'check') return 'check';
  return 'cash';
}

export function NeedsAttentionSection({ overdueRenters, expiringRenters, loading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openPanel, dismissedKeys, dismiss } = useAlertsPanel();
  const createRevenue = useCreateRevenueTransaction();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleMarkPaid(r: OverdueRenter) {
    if (!r.property_id) return;
    const key = `o-${r.renter_id}`;
    setSavingId(key);
    try {
      await createRevenue.mutateAsync({
        property_id: r.property_id,
        renter_id: r.renter_id,
        amount: r.monthly_amount,
        date_of_payment: new Date().toISOString().slice(0, 10),
        month_for: new Date().toISOString().slice(0, 8) + '01',
        payment_method: mapPaymentType(r.payment_type),
      });
      dismiss(key);
    } catch {
      showToast(t('error.saveTransactionFailed'), 'error');
    } finally {
      setSavingId(null);
    }
  }

  const visibleOverdue = overdueRenters.filter((r) => !dismissedKeys.has(`o-${r.renter_id}`));
  const visibleExpiring = expiringRenters.filter((r) => !dismissedKeys.has(`e-${r.renter_id}`));

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {t('home.needsAttention')}
      </p>
      <div className="space-y-3">
        {loading && (
          <div className="rounded-[var(--radius-card)] p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="45%" height={14} className="block" />
                  <Skeleton width="65%" height={11} className="block" />
                </div>
                <Skeleton width={64} height={14} />
              </div>
            ))}
          </div>
        )}
        {!loading && visibleOverdue.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-exp-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                {t('home.overdueRent')} ({overdueRenters.length})
              </span>
            </div>
            <div className="space-y-2">
              {visibleOverdue.slice(0, 3).map((r) => {
                const key = `o-${r.renter_id}`;
                const saving = savingId === key;
                return (
                  <div key={r.renter_id} className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/renters/${r.renter_id}`)}
                      className="flex-1 flex items-center justify-between text-start hover:opacity-80 transition-opacity min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {r.property_address} · <bdi>{t(r.days_overdue === 1 ? 'home.daysOverdue' : 'home.daysOverdue_plural', { count: r.days_overdue })}</bdi>
                        </p>
                      </div>
                      <LtrSpan className="text-sm font-semibold shrink-0 ms-2" style={{ color: 'var(--color-exp-fg)' }}>{formatMoney(r.monthly_amount)}</LtrSpan>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => dismiss(key)}
                        disabled={saving}
                        className="rounded-full px-2 py-0.5 text-xs transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                      >
                        {t('home.actionIgnore')}
                      </button>
                      {r.property_id && (
                        <button
                          onClick={() => handleMarkPaid(r)}
                          disabled={saving}
                          className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity disabled:opacity-50"
                          style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--color-exp-fg)' }}
                        >
                          {saving ? t('home.actionSaving') : t('home.actionMarkPaid')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleOverdue.length > 3 && (
              <button
                onClick={openPanel}
                className="mt-3 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-exp-fg)' }}
              >
                {t('home.seeAll')} ({visibleOverdue.length - 3} {t('home.more')})
              </button>
            )}
          </div>
        )}

        {visibleExpiring.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{ color: 'var(--color-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                {t('home.expiringLeases')} ({expiringRenters.length})
              </span>
            </div>
            <div className="space-y-2">
              {visibleExpiring.slice(0, 3).map((r) => {
                const key = `e-${r.renter_id}`;
                return (
                  <div key={r.renter_id} className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/renters/${r.renter_id}`)}
                      className="flex-1 flex items-center justify-between text-start hover:opacity-80 min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {r.property_address} · {t('home.expiresLabel', { date: r.lease_end_date })}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => dismiss(key)}
                        className="rounded-full px-2 py-0.5 text-xs transition-opacity"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                      >
                        {t('home.actionIgnore')}
                      </button>
                      <button
                        onClick={() => navigate(`/renters/${r.renter_id}`)}
                        className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}
                      >
                        {t('home.actionUpdateLease')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleExpiring.length > 3 && (
              <button
                onClick={openPanel}
                className="mt-3 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-warning)' }}
              >
                {t('home.seeAll')} ({visibleExpiring.length - 3} {t('home.more')})
              </button>
            )}
          </div>
        )}

        {!loading && visibleOverdue.length === 0 && visibleExpiring.length === 0 && (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allCaughtUp')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
