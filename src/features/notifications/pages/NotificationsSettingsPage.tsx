import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Bell, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import {
  useDeleteRule,
  usePreferences,
  useUpdateRule,
  useUpdateSettings,
} from '../queries';
import {
  NOTIFICATION_EVENTS,
  isRuleEvent,
  type NotificationEvent,
  type NotificationRule,
  type NotificationSettings,
} from '../types';
import { RuleEditorDrawer } from '../components/RuleEditorDrawer';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';

// ── small toggle switch ───────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-10 rounded-full transition-colors shrink-0"
      style={{ background: checked ? 'var(--color-primary)' : 'var(--color-outline)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: checked ? '1.125rem' : '0.125rem' }}
      />
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      {children}
    </div>
  );
}

/**
 * The CPI event's stand-in for a rule editor. Offsets and scope make no sense for it —
 * it fires when the index moves — so the only dial is how big a change has to be before
 * it's worth an alert. Committed on blur so every keystroke isn't a PUT.
 */
function CpiThresholdCard({
  settings,
  onSave,
}: {
  settings: NotificationSettings;
  onSave: (patch: Partial<NotificationSettings>) => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(settings.cpi_min_change_amount));
  const [percent, setPercent] = useState(String(settings.cpi_min_change_percent));

  const commit = (key: 'cpi_min_change_amount' | 'cpi_min_change_percent', raw: string) => {
    const value = Number(raw);
    if (raw.trim() === '' || Number.isNaN(value) || value < 0) {
      // Reject nonsense by snapping the field back to what is actually stored.
      if (key === 'cpi_min_change_amount') setAmount(String(settings.cpi_min_change_amount));
      else setPercent(String(settings.cpi_min_change_percent));
      return;
    }
    if (value !== settings[key]) onSave({ [key]: value });
  };

  const field = (
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    key: 'cpi_min_change_amount' | 'cpi_min_change_percent',
    suffix: string,
  ) => (
    <div className="flex-1">
      <label htmlFor={id} className="block text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(key, value)}
          className="h-9 w-full rounded-[9px] px-2.5 text-[13px]"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
        />
        <span className="text-[13px] shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <Card>
      <div className="px-5 py-4">
        <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {t('notifications.cpiThresholdTitle')}
        </p>
        <p className="text-[12px] mt-0.5 mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('notifications.cpiThresholdHint')}
        </p>
        <div className="flex items-end gap-3">
          {field('cpi-min-amount', t('notifications.cpiMinAmount'), amount, setAmount, 'cpi_min_change_amount', '₪')}
          {field('cpi-min-percent', t('notifications.cpiMinPercent'), percent, setPercent, 'cpi_min_change_percent', '%')}
        </div>
      </div>
    </Card>
  );
}

function scopeSummary(rule: NotificationRule, t: TFunction): string {
  if (rule.scope_property_owners.length) return rule.scope_property_owners.join(', ');
  if (rule.scope_property_ids.length) return t('notifications.scopeCountProperties', { count: rule.scope_property_ids.length });
  if (rule.scope_renter_ids.length) return t('notifications.scopeCountRenters', { count: rule.scope_renter_ids.length });
  return t('notifications.scopeAll');
}

/**
 * Rendered inside the loaded branch — the page shows a "loading" line until the
 * preferences arrive, and both anchors come with them.
 */
function NotificationsTourRequest() {
  useTour('notifications');
  return null;
}

export function NotificationsSettingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: prefs, isLoading } = usePreferences();
  const updateSettings = useUpdateSettings();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [editor, setEditor] = useState<{ event: NotificationEvent; rule: NotificationRule | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NotificationRule | null>(null);

  const settings = prefs?.settings;
  const masterOn = settings?.master_enabled ?? true;
  const eventListAnchorRef = useTourAnchor(ANCHORS.notificationsEventList);
  const rulesAnchorRef = useTourAnchor(ANCHORS.notificationsRulesEntry);
  const firstRuleEvent = NOTIFICATION_EVENTS.find(isRuleEvent);

  const setSetting = (patch: Parameters<typeof updateSettings.mutate>[0]) =>
    updateSettings.mutate(patch, { onError: () => showToast(t('error.saveFailed'), 'error') });

  const isMuted = (event: NotificationEvent) => settings?.muted_events.includes(event) ?? false;

  const toggleMute = (event: NotificationEvent, enabled: boolean) => {
    const current = settings?.muted_events ?? [];
    const next = enabled ? current.filter((e) => e !== event) : [...current, event];
    setSetting({ muted_events: next });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRule.mutateAsync(pendingDelete.id);
      showToast(t('notifications.deletedToast'), 'success');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Bell size={20} aria-hidden="true" /> {t('common.notifications')}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.subtitle')}</p>
      </div>

      {isLoading || !settings ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <NotificationsTourRequest />
          {/* Global settings */}
          <Card>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('notifications.master')}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.masterHint')}</p>
              </div>
              <Toggle checked={masterOn} onChange={(v) => setSetting({ master_enabled: v })} label={t('notifications.master')} />
            </div>
          </Card>

          {/* Per-event sections */}
          <div ref={eventListAnchorRef} className="flex flex-col gap-6">
          {NOTIFICATION_EVENTS.map((event) => {
            const rules = (prefs?.rules ?? []).filter((r) => r.event_type === event);
            const muted = isMuted(event);
            const dimmed = muted || !masterOn;
            return (
              <section key={event}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {t(`notifications.event.${event}`)}
                  </h2>
                  <Toggle checked={!muted} onChange={(v) => toggleMute(event, v)} label={t(`notifications.event.${event}`)} />
                </div>

                {/* Only the first rule-bearing event carries the anchor — the block repeats
                    per event, and it is present whether the event has rules yet or is
                    still on its default. */}
                <div
                  ref={event === firstRuleEvent ? rulesAnchorRef : undefined}
                  style={{ opacity: dimmed ? 0.5 : 1, pointerEvents: dimmed ? 'none' : 'auto' }}
                >
                  {!isRuleEvent(event) ? (
                    <CpiThresholdCard settings={settings} onSave={setSetting} />
                  ) : rules.length === 0 ? (
                    <Card>
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1">
                          <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('notifications.usingDefault')}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t(`notifications.default.${event}`)}</p>
                        </div>
                        <button
                          onClick={() => setEditor({ event, rule: null })}
                          className="h-9 px-3.5 rounded-[9px] text-[13px] font-medium shrink-0"
                          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
                        >
                          {t('notifications.customize')}
                        </button>
                      </div>
                    </Card>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {rules.map((rule) => (
                        <Card key={rule.id}>
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13.5px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {rule.label || t('notifications.untitledRule')}
                              </p>
                              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                {t(event === 'lease_expiring' ? 'notifications.summaryBefore' : 'notifications.summaryAfter', { days: rule.offsets.join(', ') })}
                                {' · '}{scopeSummary(rule, t)}
                              </p>
                            </div>
                            <Toggle
                              checked={rule.enabled}
                              onChange={(v) => updateRule.mutate({ id: rule.id, patch: { enabled: v } })}
                              label={t('notifications.ruleEnabled')}
                            />
                            <button onClick={() => setEditor({ event, rule })} aria-label={t('common.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button onClick={() => setPendingDelete(rule)} aria-label={t('common.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: 'var(--color-error)' }}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </Card>
                      ))}
                      <button
                        onClick={() => setEditor({ event, rule: null })}
                        className="flex items-center gap-1.5 self-start text-[13px] font-medium mt-1"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <Plus size={15} aria-hidden="true" /> {t('notifications.addRule')}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          </div>
        </div>
      )}

      {editor && (
        <RuleEditorDrawer
          open
          onClose={() => setEditor(null)}
          event={editor.event}
          rule={editor.rule}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('notifications.deleteRuleTitle')}
        message={t('notifications.deleteRuleMessage')}
        loading={deleteRule.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
