// Shared types for the notifications feed and the preferences/rules engine.
// Mirrors the backend schemas in app/schemas/notification.py.

export type NotificationEvent = 'overdue' | 'lease_expiring';

export const NOTIFICATION_EVENTS: NotificationEvent[] = ['overdue', 'lease_expiring'];

export interface NotificationData {
  days_overdue?: number;
  days_until_expiry?: number;
  amount?: number;
  offset?: number;
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
