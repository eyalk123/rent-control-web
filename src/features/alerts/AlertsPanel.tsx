import { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { createRevenueTransaction } from '@/features/transactions/api/transactions';
import { useOverdueRenters, useExpiringRenters } from '@/features/home/queries';
import { useAlertsPanel } from './AlertsPanelContext';
import type { OverdueRenter } from '@/features/home/api/homeApi';
import type { PaymentMethod } from '@/shared/types';

const SEEN_KEY = 'alerts_seen_ids';

function getSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

function mapPaymentType(type?: string | null): PaymentMethod {
  if (type === 'wire_transfer') return 'bank_transfer';
  if (type === 'bit') return 'bit';
  if (type === 'check') return 'check';
  return 'cash';
}

export function AlertsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOpen, closePanel, setHasAlerts } = useAlertsPanel();

  const { data: overdueRenters = [] } = useOverdueRenters();
  const { data: expiringRenters = [] } = useExpiringRenters(60);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);

  useEffect(() => {
    setHasAlerts(overdueRenters.length > 0 || expiringRenters.length > 0);
  }, [overdueRenters, expiringRenters, setHasAlerts]);

  function dismiss(key: string) {
    setDismissed(prev => new Set(prev).add(key));
  }

  function handleNavigate(renterId: number, key: string) {
    markSeen(key);
    setSeenIds(getSeenIds());
    navigate(`/renters/${renterId}`);
    closePanel();
  }

  async function handleMarkPaid(r: OverdueRenter) {
    if (!r.property_id) return;
    const key = `o_${r.renter_id}`;
    setSavingId(key);
    try {
      await createRevenueTransaction({
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

  const visibleOverdue = overdueRenters.filter(r => !dismissed.has(`o_${r.renter_id}`));
  const visibleExpiring = expiringRenters.filter(r => !dismissed.has(`e_${r.renter_id}`));

  return (
    <Drawer open={isOpen} onClose={closePanel} title={t('common.notifications')} width={420}>
      <div className="space-y-4">
        {visibleOverdue.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-exp-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                {t('home.overdueRent')} ({overdueRenters.length})
              </span>
            </div>
            <div className="space-y-2">
              {visibleOverdue.map(r => {
                const key = `o_${r.renter_id}`;
                const saving = savingId === key;
                const seen = seenIds.has(key);
                return (
                  <div key={r.renter_id} className={`flex items-center gap-2 transition-opacity ${seen ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => handleNavigate(r.renter_id, key)}
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
              {visibleExpiring.map(r => {
                const key = `e_${r.renter_id}`;
                const seen = seenIds.has(key);
                return (
                  <div key={r.renter_id} className={`flex items-center gap-2 transition-opacity ${seen ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => handleNavigate(r.renter_id, key)}
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
                        onClick={() => handleNavigate(r.renter_id, key)}
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
          </div>
        )}

        {visibleOverdue.length === 0 && visibleExpiring.length === 0 && (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allCaughtUp')}</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
