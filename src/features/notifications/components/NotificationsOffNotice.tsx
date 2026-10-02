import { BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../queries';

/** True only once preferences have loaded and say so — an unknown state shows the feed. */
export function useNotificationsOff(): boolean {
  const { data } = usePreferences();
  return data?.settings.master_enabled === false;
}

/**
 * Stands in for the alert list while notifications are switched off. The server returns
 * an empty feed then, and "All caught up" would claim there is nothing to chase when the
 * truth is that nothing is being checked.
 */
export function NotificationsOffNotice({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div
      className="rounded-[var(--radius-card)] p-6 text-center space-y-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <BellOff size={18} className="mx-auto" style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.masterOff')}</p>
      <button
        onClick={() => { navigate('/settings/notifications'); onNavigate?.(); }}
        className="rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
      >
        {t('notifications.turnOn')}
      </button>
    </div>
  );
}
