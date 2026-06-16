import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { FormChipInput } from '@/shared/components/form/FormChipInput';
import { useCreateRule, useUpdateRule, previewRule } from '../queries';
import type { NotificationEvent, NotificationRule, NotificationRuleDraft, RulePreview } from '../types';
import { ScopeSelector, type ScopeValue } from './ScopeSelector';

interface Props {
  open: boolean;
  onClose: () => void;
  event: NotificationEvent;
  rule?: NotificationRule | null; // present when editing
}

export function RuleEditorDrawer({ open, onClose, event, rule }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const [label, setLabel] = useState('');
  const [offsets, setOffsets] = useState<number[]>([]);
  const [scope, setScope] = useState<ScopeValue>({
    scope_property_ids: [],
    scope_property_owners: [],
    scope_renter_ids: [],
  });
  const [preview, setPreview] = useState<RulePreview | null>(null);

  // Seed the form whenever the drawer (re)opens for a given rule.
  useEffect(() => {
    if (!open) return;
    setLabel(rule?.label ?? '');
    setOffsets(rule?.offsets ?? []);
    setScope({
      scope_property_ids: rule?.scope_property_ids ?? [],
      scope_property_owners: rule?.scope_property_owners ?? [],
      scope_renter_ids: rule?.scope_renter_ids ?? [],
    });
    setPreview(null);
  }, [open, rule]);

  const draft: NotificationRuleDraft = {
    event_type: event,
    label: label.trim() || null,
    offsets,
    ...scope,
  };

  // Debounced live preview as the user edits offsets / scope.
  useEffect(() => {
    if (!open || offsets.length === 0) {
      setPreview(null);
      return;
    }
    const handle = setTimeout(() => {
      previewRule(draft).then(setPreview).catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offsets, scope]);

  const saving = createRule.isPending || updateRule.isPending;

  const handleSave = async () => {
    try {
      if (rule) {
        await updateRule.mutateAsync({ id: rule.id, patch: draft });
      } else {
        await createRule.mutateAsync(draft);
      }
      showToast(t('notifications.savedToast'), 'success');
      onClose();
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const offsetLabel = event === 'lease_expiring'
    ? t('notifications.remindBefore')
    : t('notifications.remindAfter');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={rule ? t('notifications.editRule') : t('notifications.newRule')}
      width={460}
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-[9px] text-[13px] font-medium"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || offsets.length === 0}
            className="h-9 px-4 rounded-[9px] text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving ? t('home.actionSaving') : t('notifications.saveRule')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            {t('notifications.ruleName')}
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('notifications.ruleNamePlaceholder')}
            className="h-10 w-full rounded-[9px] px-3 text-sm outline-none"
            style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div>
          <FormChipInput
            label={offsetLabel}
            placeholder={t('notifications.offsetPlaceholder')}
            numeric
            sort
            value={offsets.join(', ')}
            onChange={(v) =>
              setOffsets(
                v.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)),
              )
            }
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('notifications.offsetHint')}
          </p>
        </div>

        <ScopeSelector value={scope} onChange={setScope} />

        <div
          className="rounded-[9px] px-3 py-2.5 text-[13px]"
          style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)' }}
        >
          {offsets.length === 0
            ? t('notifications.previewEmpty')
            : preview
              ? t('notifications.preview', { renters: preview.matched_renters, alerts: preview.estimated_alerts })
              : t('notifications.previewLoading')}
        </div>
      </div>
    </Drawer>
  );
}
