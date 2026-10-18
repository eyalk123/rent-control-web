import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmtDate } from '@/shared/utils/dates';
import type { NotificationItem } from '../types';

interface Props {
  items: NotificationItem[];
  /** Opens the property (or the list, when several mortgages have prime). */
  onOpen: (path: string) => void;
  onDismiss: (id: number) => void;
}

/**
 * The Bank of Israel moved the rate, and one of the owner's mortgages has a prime track.
 * About the owner, not a renter: it opens the property, whose Mortgage section's "+" is
 * where the new payment is recorded. Shared by the home list and the alerts panel.
 */
export function RateChangeCard({ items, onOpen, onDismiss }: Props) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Landmark size={15} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          {t('notifications.event.mortgage_rate_change')}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const up = (item.data.new_prime ?? 0) > (item.data.old_prime ?? 0);
          const path = item.property_id ? `/properties/${item.property_id}` : '/properties';
          return (
            <div key={item.id} className="flex items-start gap-2">
              <button onClick={() => onOpen(path)} className="flex-1 text-start hover:opacity-80 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  <bdi>{t(up ? 'notifications.rateUp' : 'notifications.rateDown', { rate: item.data.new_prime })}</bdi>
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <bdi>{t('notifications.rateWas', { rate: item.data.old_prime, date: fmtDate(item.data.effective_date ?? '') })}</bdi>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('notifications.rateNote')}
                </p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDismiss(item.id)}
                  className="rounded-full px-2 py-0.5 text-xs transition-opacity"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                >
                  {t('home.actionIgnore')}
                </button>
                <button
                  onClick={() => onOpen(path)}
                  className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                >
                  {t('notifications.rateUpdate')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
