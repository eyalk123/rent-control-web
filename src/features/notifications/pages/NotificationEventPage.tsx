import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { currencySymbol } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';
import { Toggle } from '@/shared/components/ui/Toggle';
import { useLanguage } from '@/hooks/useLanguage';
import { usePreferences, useUpdateRule, useUpdateSettings } from '../queries';
import {
  NOTIFICATION_EVENTS,
  isRuleEvent,
  type NotificationEvent,
  type NotificationRule,
  type NotificationSettings,
} from '../types';
import { ruleScheduleText, ruleScopeText } from '../summary';
import { RuleEditorDrawer } from '../components/RuleEditorDrawer';

const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-outline)' };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </h2>
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
          className="h-10 w-full rounded-[9px] px-3 text-[14px]"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
        />
        <span className="text-[13px] shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="px-5 py-4 rounded-[var(--radius-card)]" style={cardStyle}>
      <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {t('notifications.cpiThresholdTitle')}
      </p>
      <div className="flex items-end gap-3 my-3">
        {field('cpi-min-amount', t('notifications.cpiMinAmount'), amount, setAmount, 'cpi_min_change_amount', currencySymbol())}
        {field('cpi-min-percent', t('notifications.cpiMinPercent'), percent, setPercent, 'cpi_min_change_percent', '%')}
      </div>
      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.cpiThresholdHint')}</p>
    </div>
  );
}

/**
 * One event's settings: its on/off switch, then either its reminder list (with the
 * built-in default shown when no custom reminder is active) or, for CPI, the threshold.
 * Mirrors the mobile NotificationEventScreen.
 */
export function NotificationEventPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRtl } = useLanguage();
  const { showToast } = useToast();
  const { data: prefs, isLoading } = usePreferences();
  const updateSettings = useUpdateSettings();
  const updateRule = useUpdateRule();
  const [editor, setEditor] = useState<{ rule: NotificationRule | null } | null>(null);

  const params = useParams<{ event: string }>();
  const event: NotificationEvent = NOTIFICATION_EVENTS.includes(params.event as NotificationEvent)
    ? (params.event as NotificationEvent)
    : 'overdue';
  const title = t(`notifications.event.${event}`);
  const settings = prefs?.settings;
  const Back = isRtl ? ChevronRight : ChevronLeft;
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const setSetting = (patch: Partial<NotificationSettings>) =>
    updateSettings.mutate(patch, { onError: () => showToast(t('error.saveFailed'), 'error') });

  const setEventEnabled = (enabled: boolean) => {
    const current = settings?.muted_events ?? [];
    setSetting({ muted_events: enabled ? current.filter((e) => e !== event) : [...current, event] });
  };

  const setRuleEnabled = (rule: NotificationRule, enabled: boolean) =>
    updateRule.mutate({ id: rule.id, patch: { enabled } }, { onError: () => showToast(t('error.saveFailed'), 'error') });

  const header = (
    <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--color-outline)' }}>
      <button
        onClick={() => navigate('/settings/notifications')}
        className="inline-flex items-center gap-1 text-[12px] font-medium mb-1.5"
        style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Back size={14} aria-hidden="true" /> {t('common.notifications')}
      </button>
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
    </div>
  );

  if (isLoading || !prefs || !settings) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-6 lg:px-8 lg:py-8">
        {header}
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  const muted = settings.muted_events.includes(event);
  const rules = prefs.rules.filter((r) => r.event_type === event);
  const hasActiveRule = rules.some((r) => r.enabled);
  const hint = (text: string) => (
    <p className="text-[13px] px-1" style={{ color: 'var(--color-text-secondary)' }}>{text}</p>
  );

  // Shown whenever no custom reminder is active — which is exactly when the backend
  // falls back to it, including when every custom reminder has been switched off.
  const defaultCard = (
    <div className="px-5 py-4 rounded-[var(--radius-card)]" style={cardStyle}>
      <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.defaultLabel')}</p>
      <p className="text-[14px] font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{t(`notifications.default.${event}`)}</p>
    </div>
  );

  const reminders = (
    <section className="flex flex-col gap-2">
      <SectionLabel>{t('notifications.whenTitle')}</SectionLabel>
      {!hasActiveRule && defaultCard}
      {rules.length > 0 && (
        <div className="rounded-[var(--radius-card)] overflow-hidden" style={cardStyle}>
          {rules.map((rule, i) => (
            // The whole row opens the editor; the switch stops its click so toggling a
            // reminder never opens it. A div rather than a button, since a button cannot
            // hold the switch — the name inside is the keyboard-reachable control.
            <div
              key={rule.id}
              onClick={() => setEditor({ rule })}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--color-input-filled-background)]"
              style={i > 0 ? { borderTop: '1px solid var(--color-outline)' } : undefined}
            >
              <button type="button" className="flex-1 min-w-0 text-start">
                <span className="block text-[14px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {rule.label || ruleScheduleText(rule, t)}
                </span>
                <span className="block text-[13px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {rule.label ? `${ruleScheduleText(rule, t)} · ${ruleScopeText(rule, t)}` : ruleScopeText(rule, t)}
                </span>
              </button>
              <span onClick={(e) => e.stopPropagation()} className="flex">
                <Toggle checked={rule.enabled} onChange={(v) => setRuleEnabled(rule, v)} label={t('notifications.ruleEnabled')} />
              </span>
              <Chevron size={16} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          ))}
        </div>
      )}
      {!hasActiveRule && hint(rules.length > 0 ? t('notifications.allPaused') : t('notifications.defaultHint'))}
      <button
        onClick={() => setEditor({ rule: null })}
        className="flex items-center gap-1.5 self-start text-[13px] font-medium px-1 py-1"
        style={{ color: 'var(--color-primary)' }}
      >
        <Plus size={15} aria-hidden="true" /> {t('notifications.addRule')}
      </button>
    </section>
  );

  const cpi = (
    <>
      <section className="flex flex-col gap-2">
        <SectionLabel>{t('notifications.cpiWhenTitle')}</SectionLabel>
        <div className="px-5 py-4 rounded-[var(--radius-card)]" style={cardStyle}>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t(`notifications.default.${event}`)}</p>
        </div>
      </section>
      <CpiThresholdCard settings={settings} onSave={setSetting} />
    </>
  );

  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 lg:px-8 lg:py-8">
      {header}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-card)]" style={cardStyle}>
          <p className="flex-1 text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('notifications.eventSwitch')}</p>
          <Toggle checked={!muted} onChange={setEventEnabled} label={title} />
        </div>

        {!settings.master_enabled
          ? hint(t('notifications.masterOff'))
          : muted
            ? hint(t('notifications.eventOffHint'))
            : isRuleEvent(event)
              ? reminders
              : cpi}
      </div>

      {editor && (
        <RuleEditorDrawer open onClose={() => setEditor(null)} event={event} rule={editor.rule} />
      )}
    </div>
  );
}
