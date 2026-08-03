// Shared types for the notifications feed and the preferences/rules engine.
// Mirrors the backend schemas in app/schemas/notification.py.

export type NotificationEvent = 'overdue' | 'lease_expiring' | 'cpi_rent_change';

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  'overdue',
  'lease_expiring',
  'cpi_rent_change',
];

// Events with no rule editor: offsets and scope describe "how long before a date I know
// about", and a CPI change has no such date — it fires when the index moves. Configured
// by mute + materiality threshold instead. Mirrors RULE_EXEMPT_EVENTS on the backend.
export const RULE_EXEMPT_EVENTS: NotificationEvent[] = ['cpi_rent_change'];

export const isRuleEvent = (event: NotificationEvent) => !RULE_EXEMPT_EVENTS.includes(event);

// The two stages of a cpi_rent_change: an estimate before the lease anniversary, and the
// confirmed amount once the index for it is published.
export type CpiChangeStage = 'upcoming' | 'changed';

export interface NotificationData {
  days_overdue?: number;
  days_until_expiry?: number;
  amount?: number;
  offset?: number;
  // cpi_rent_change only.
  stage?: CpiChangeStage;
  old_amount?: number;
  new_amount?: number;
  delta?: number;
  delta_percent?: number | null;
  effective_date?: string;
  year_index?: number;
  base_index?: number | null;
  known_index?: number | null;
  index_month?: string | null;
  index_source?: string | null;
}

export interface NotificationItem {
  id: number;
  type: NotificationEvent;
  renter_id: number;
  first_name: string | null;
  last_name: string | null;
  property_id: number | null;
  property_address: string | null;
  payment_type: string | null;
  offset: number;
  data: NotificationData;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

export interface NotificationSettings {
  master_enabled: boolean;
  muted_events: NotificationEvent[];
  // Materiality floor for cpi_rent_change: a change must clear the larger of the two.
  cpi_min_change_amount: number;
  cpi_min_change_percent: number;
}

export interface NotificationRule {
  id: number;
  event_type: NotificationEvent;
  label: string | null;
  enabled: boolean;
  offsets: number[];
  scope_property_ids: number[];
  scope_property_owners: string[];
  scope_renter_ids: number[];
}

export interface NotificationPreferences {
  settings: NotificationSettings;
  rules: NotificationRule[];
}

// Draft sent when creating a rule or requesting a preview (no id yet).
export interface NotificationRuleDraft {
  event_type: NotificationEvent;
  label?: string | null;
  enabled?: boolean;
  offsets: number[];
  scope_property_ids: number[];
  scope_property_owners: string[];
  scope_renter_ids: number[];
}

export interface RulePreview {
  matched_renters: number;
  estimated_alerts: number;
}
