import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Pill } from '@/shared/components/ui/Pill';
import { useToast } from '@/shared/components/ui/Toast';
import { isPropertyOwnerConflict, useDeletePropertyOwner } from '../queries';
import type { PropertyOwner } from '@/shared/types';

interface Props {
  open: boolean;
  owner: PropertyOwner | null;
  onClose: () => void;
  onEdit: (id: number) => void;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {children}
      </span>
    </div>
  );
}

export function PropertyOwnerDetailDrawer({ open, owner, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const deleteMutation = useDeletePropertyOwner();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Delete is offered only to an owner with nothing left on them; the server refuses the
  // rest with a 409, and saying why up front beats a button that fails.
  const canDelete = !!owner && owner.property_count === 0;

  const handleDelete = async () => {
    if (!owner) return;
    try {
      await deleteMutation.mutateAsync(owner.id);
      showToast(t('propertyOwners.deleteSuccess'), 'success');
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      setConfirmOpen(false);
      showToast(t(isPropertyOwnerConflict(err) ? 'propertyOwners.deleteBlocked' : 'error.saveFailed'), 'error');
    }
  };

  const footer = owner && (
    <div className="flex items-center gap-3">
      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1.5 h-10 px-3 rounded-[9px] text-[13px] font-medium"
          style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'transparent' }}
        >
          <Trash2 size={14} />{t('common.delete')}
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(owner.id)}
        className="flex items-center gap-1.5 h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 ms-auto"
        style={{ background: 'var(--color-primary)' }}
      >
        <Pencil size={14} />{t('common.edit')}
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={owner?.name ?? t('propertyOwners.details')}
        width={480}
        footer={footer}
      >
        {owner && (
          <div className="space-y-5">
            {!owner.is_active && (
              <div>
                <Pill tone="neutral">{t('suppliers.inactive')}</Pill>
              </div>
            )}

            <InfoRow label={t('propertyOwners.properties')}>
              {t('propertyOwners.propertyCount', { count: owner.property_count })}
            </InfoRow>

            {owner.phone && (
              <InfoRow label={t('suppliers.phone')}>
                <a href={`tel:${owner.phone}`} style={{ color: 'var(--color-primary)' }} className="hover:underline">
                  {owner.phone}
                </a>
              </InfoRow>
            )}

            {owner.email && (
              <InfoRow label={t('suppliers.email')}>
                <a href={`mailto:${owner.email}`} style={{ color: 'var(--color-primary)' }} className="hover:underline">
                  {owner.email}
                </a>
              </InfoRow>
            )}

            {owner.bank_account && (
              <InfoRow label={t('suppliers.bankAccount')}>
                <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  <Building2 size={13} style={{ color: 'var(--color-text-secondary)' }} /> {owner.bank_account}
                </span>
              </InfoRow>
            )}

            {owner.notes && (
              <InfoRow label={t('suppliers.notes')}>
                <span className="whitespace-pre-wrap">{owner.notes}</span>
              </InfoRow>
            )}

            {!canDelete && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('propertyOwners.deleteBlocked')}
              </p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={t('propertyOwners.deleteConfirm')}
        message={t('propertyOwners.deleteMessage')}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
