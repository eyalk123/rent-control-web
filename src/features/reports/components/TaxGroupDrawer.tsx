import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { Check } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { FormInput } from '@/shared/components/form/FormInput';
import { PropertyMultiSelect } from '@/shared/components/form/PropertyMultiSelect';
import { useToast } from '@/shared/components/ui/Toast';
import { usePropertyOwners } from '@/features/property-owners/queries';
import { useAccessibleProperties } from '@/features/properties/queries';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import { useDeleteTaxGroup, useSaveTaxGroup } from '../taxQueries';
import type { TaxGroup } from '../api/taxTracks';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The group being edited; absent for a new one. */
  group?: TaxGroup;
}

function isConflict(err: unknown): boolean {
  if (isAxiosError(err)) return err.response?.status === 409;
  return (err as { response?: { status?: number } })?.response?.status === 409;
}

/**
 * Builds a household for the tax report: owners who share one exemption ceiling, or a set of
 * properties picked by hand. Saved on the server; affects nothing outside the tax report.
 */
export function TaxGroupDrawer({ open, onClose, group }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: owners = [] } = usePropertyOwners({ includeInactive: true });
  const { data: properties = [] } = useAccessibleProperties();
  const save = useSaveTaxGroup();
  const remove = useDeleteTaxGroup();

  const [name, setName] = useState('');
  const [ownerIds, setOwnerIds] = useState<number[]>([]);
  const [propertyIds, setPropertyIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setOwnerIds(group?.property_owner_ids ?? []);
    setPropertyIds(group?.property_ids ?? []);
    setError('');
  }, [open, group]);

  const toggleOwner = (id: number) =>
    setOwnerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!name.trim()) { setError(t('common.required')); return; }
    if (ownerIds.length === 0 && propertyIds.length === 0) { setError(t('taxTracks.groupNeedsMember')); return; }
    try {
      await save.mutateAsync({ id: group?.id, data: { name: name.trim(), property_owner_ids: ownerIds, property_ids: propertyIds } });
      showToast(t('taxTracks.groupSaved'), 'success');
      onClose();
    } catch (err) {
      if (isConflict(err)) { setError(t('taxTracks.groupConflict')); return; }
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    if (!group) return;
    try {
      await remove.mutateAsync(group.id);
      showToast(t('taxTracks.groupDeleted'), 'success');
      onClose();
    } catch {
      showToast(t('error.deleteFailed'), 'error');
    }
  };

  const propertyOptions = properties.map((p) => ({ value: p.id, label: `${p.address}${formatFloorApartment(p, t)}, ${p.city}` }));

  const footer = (
    <div className="flex items-center gap-3">
      {group && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
          style={{ color: 'var(--color-error)', background: 'none', border: 'none' }}
        >
          {t('taxTracks.deleteGroup')}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium ms-auto"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={save.isPending}
        className="h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary-fill)' }}
      >
        {save.isPending ? '...' : t('common.save')}
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={group ? t('taxTracks.editGroup') : t('taxTracks.newGroup')}
        width={520}
        footer={footer}
      >
        <div className="space-y-5">
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('taxTracks.groupsHint')}
          </p>
          <FormInput label={t('taxTracks.groupName')} required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('taxTracks.groupOwners')}</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-outline)' }}>
              {owners.map((o, i) => {
                const checked = ownerIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleOwner(o.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-start text-sm"
                    style={{ background: 'var(--color-surface)', borderTop: i === 0 ? 'none' : '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
                  >
                    <span
                      className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px]"
                      style={{ border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--color-input-border)'}`, background: checked ? 'var(--color-primary)' : 'transparent', width: 18, height: 18 }}
                    >
                      {checked && <Check size={12} color="white" />}
                    </span>
                    {o.name}
                  </button>
                );
              })}
            </div>
          </div>
          <PropertyMultiSelect
            label={t('taxTracks.groupProperties')}
            options={propertyOptions}
            selectedIds={propertyIds}
            onChange={setPropertyIds}
            placeholder={t('taxTracks.groupPropertiesPlaceholder')}
          />
          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirmDelete}
        title={t('taxTracks.deleteGroup')}
        message={t('taxTracks.deleteGroupConfirm')}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
