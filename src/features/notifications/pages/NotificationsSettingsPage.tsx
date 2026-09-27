import { Link } from 'react-router-dom';
import { allowedModes } from '@/shared/utils/capabilities';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { usePreferences, useUpdateSettings } from '../queries';
import { NOTIFICATION_EVENTS, EVENT_REQUIREMENTS, isRuleEvent } from '../types';
import { EVENT_ICONS, eventSummary } from '../summary';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';
import { Toggle } from '@/shared/components/ui/Toggle';
import { useLanguage } from '@/hooks/useLanguage';

const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-outline)' };

/**
 * Rendered inside the loaded branch — the page shows a "loading" line until the
 * preferences arrive, and both anchors come with them.
 */
function NotificationsTourRequest() {
  useTour('notifications');
  return null;
}

/**
 * The overview: the master switch, then one row per event saying when it fires (or that
 * it is off). The master is the only switch here — an event's own on/off, its custom
 * rules and the CPI threshold all live a click deeper on NotificationEventPage, so no
 * control appears in two places. Mirrors the mobile NotificationsSettingsScreen.
 */
export function NotificationsSettingsPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const { showToast } = useToast();
  const { data: prefs, isLoading } = usePreferences();
  const updateSettings = useUpdateSettings();

  const settings = prefs?.settings;
  const eventListAnchorRef = useTourAnchor(ANCHORS.notificationsEventList);
  const rulesAnchorRef = useTourAnchor(ANCHORS.notificationsRulesEntry);
  // Only the events this country can actually receive. An account with no index source
  // behind it can never get a `cpi_rent_change`, so listing it here would be a row for
  // something that cannot happen.
  const availableEvents = allowedModes(NOTIFICATION_EVENTS, EVENT_REQUIREMENTS);
  const firstRuleEvent = availableEvents.find(isRuleEvent);
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const setMaster = (v: boolean) =>
    updateSettings.mutate({ master_enabled: v }, { onError: () => showToast(t('error.saveFailed'), 'error') });

  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Bell size={20} aria-hidden="true" /> {t('common.notifications')}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.subtitle')}</p>
      </div>

      {isLoading || !prefs || !settings ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <NotificationsTourRequest />

          {/* Master switch — the page's one top-level control, set larger than the rows under it. */}
          <div className="flex items-center gap-4 px-5 py-5 rounded-[var(--radius-card)]" style={cardStyle}>
            <div className="flex-1">
              <p className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('notifications.master')}</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.masterHint')}</p>
            </div>
            <Toggle checked={settings.master_enabled} onChange={setMaster} label={t('notifications.master')} />
          </div>

          {settings.master_enabled ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('notifications.sectionAlerts')}
              </h2>
              <div ref={eventListAnchorRef} className="rounded-[var(--radius-card)] overflow-hidden" style={cardStyle}>
                {availableEvents.map((event, i) => {
                  const muted = settings.muted_events.includes(event);
                  const rules = prefs.rules.filter((r) => r.event_type === event);
                  const Icon = EVENT_ICONS[event];
                  return (
                    // Only the first rule-bearing event carries the rules anchor: it is the
                    // row that leads to the reminder editor.
                    <Link
                      key={event}
                      ref={event === firstRuleEvent ? rulesAnchorRef : undefined}
                      to={`/settings/notifications/${event}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-input-filled-background)]"
                      style={i > 0 ? { borderTop: '1px solid var(--color-outline)' } : undefined}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'var(--color-primary-container)', color: 'var(--color-primary)', opacity: muted ? 0.5 : 1 }}
                      >
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {t(`notifications.event.${event}`)}
                        </span>
                        <span className="block text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {muted ? t('notifications.eventOff') : eventSummary(event, rules, settings, t)}
                        </span>
                      </span>
                      <Chevron size={16} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="flex items-start gap-2 px-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
              <p>{t('notifications.masterOff')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
