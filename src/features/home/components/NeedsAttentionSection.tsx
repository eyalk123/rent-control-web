import { AlertCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/shared/utils/money';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import type { OverdueRenter, ExpiringRenter } from '../api/homeApi';

interface Props {
  overdueRenters: OverdueRenter[];
  expiringRenters: ExpiringRenter[];
}

export function NeedsAttentionSection({ overdueRenters, expiringRenters }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {t('home.needsAttention')}
      </p>
      <div className="space-y-3">
        {overdueRenters.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-exp-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                {t('home.overdueRent')} ({overdueRenters.length})
              </span>
            </div>
            <div className="space-y-2">
              {overdueRenters.slice(0, 3).map((r) => (
                <button
                  key={r.renter_id}
                  onClick={() => navigate(`/renters/${r.renter_id}`)}
                  className="w-full flex items-center justify-between text-start hover:opacity-80 transition-opacity"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.property_address} · {t('home.daysOverdue', { count: r.days_overdue })}</p>
                  </div>
                  <LtrSpan className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-exp-fg)' }}>{formatMoney(r.monthly_amount)}</LtrSpan>
                </button>
              ))}
            </div>
          </div>
        )}

        {expiringRenters.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{ color: 'var(--color-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                {t('home.expiringLeases')} ({expiringRenters.length})
              </span>
            </div>
            <div className="space-y-2">
              {expiringRenters.slice(0, 3).map((r) => (
                <button
                  key={r.renter_id}
                  onClick={() => navigate(`/renters/${r.renter_id}`)}
                  className="w-full flex items-center justify-between text-start hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.first_name} {r.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.property_address} · {t('home.expiresIn', { count: r.days_until_expiry })}</p>
                  </div>
                  <ArrowUpRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {overdueRenters.length === 0 && expiringRenters.length === 0 && (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allGood')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
