import type { TFunction } from 'i18next';
import { CalendarClock, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { formatMoney } from '@/shared/utils/money';
import { isRuleEvent, type NotificationEvent, type NotificationRule, type NotificationSettings } from './types';

export const EVENT_ICONS: Record<NotificationEvent, LucideIcon> = {
  overdue: Wallet,
  lease_expiring: CalendarClock,
  cpi_rent_change: TrendingUp,
};

export function ruleScheduleText(rule: NotificationRule, t: TFunction): string {
  return t(rule.event_type === 'lease_expiring' ? 'notifications.summaryBefore' : 'notifications.summaryAfter', {
    days: rule.offsets.join(', '),
  });
}

export function ruleScopeText(rule: NotificationRule, t: TFunction): string {
  if (rule.scope_property_owners.length) return rule.scope_property_owners.join(', ');
  if (rule.scope_property_ids.length) return t('notifications.scopeCountProperties', { count: rule.scope_property_ids.length });
  if (rule.scope_renter_ids.length) return t('notifications.scopeCountRenters', { count: rule.scope_renter_ids.length });
  return t('notifications.scopeAll');
}

/**
 * The one line under an event on the overview: when it will actually fire. Mirrors the
 * backend's fallback — the built-in default applies whenever the event has no *enabled*
 * custom rule, so a list of paused rules reads as the default, not as "2 reminders".
 */
export function eventSummary(
  event: NotificationEvent,
  rules: NotificationRule[],
  settings: NotificationSettings,
  t: TFunction,
): string {
  if (!isRuleEvent(event)) {
    const amount = settings.cpi_min_change_amount;
    const percent = settings.cpi_min_change_percent;
    if (amount > 0 && percent > 0) {
      return t('notifications.cpiSummary', { amount: formatMoney(amount), percent });
    }
    if (amount > 0) return t('notifications.cpiSummaryOne', { value: formatMoney(amount) });
    if (percent > 0) return t('notifications.cpiSummaryOne', { value: `${percent}%` });
    return t('notifications.cpiSummaryAll');
  }
  const active = rules.filter((r) => r.enabled);
  if (active.length === 0) return t(`notifications.schedule.${event}`);
  if (active.length === 1) return ruleScheduleText(active[0], t);
  return t('notifications.customCount', { count: active.length });
}
