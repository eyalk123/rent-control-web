import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Pill } from '@/shared/components/ui/Pill';
import { useToast } from '@/shared/components/ui/Toast';
import { useUpdateSupplier } from '../queries';
import type { Supplier } from '@/shared/types';

interface Props {
  open: boolean;
  supplier: Supplier | null;
  catMap: Map<number, string>;
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

export function SupplierDetailDrawer({ open, supplier, catMap, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const updateMutation = useUpdateSupplier(supplier?.id ?? 0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeactivate = async () => {
    if (!supplier) return;
    try {
      await updateMutation.mutateAsync({ is_active: false });
      showToast(t('suppliers.deactivateSuccess'), 'success');
      setConfirmOpen(false);
      onClose();
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const footer = supplier && (
    <div className="flex items-center gap-3">
      {supplier.is_active !== false && (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1.5 h-10 px-3 rounded-[9px] text-[13px] font-medium"
          style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'transparent' }}
        >
          <Trash2 size={14} />{t('suppliers.deactivate')}
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(supplier.id)}
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
        title={supplier?.name ?? t('suppliers.details')}
        width={480}
        footer={footer}
      >
        {supplier && (
          <div className="space-y-5">
            {!supplier.is_active && (
              <div>
                <Pill tone="neutral">{t('suppliers.inactive')}</Pill>
              </div>
            )}

            {supplier.category_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {supplier.category_ids.map((cid) => (
                  <Pill key={cid} tone="info">{catMap.get(cid) ?? String(cid)}</Pill>
                ))}
              </div>
            )}

            {supplier.phone && (
              <InfoRow label={t('suppliers.phone')}>
                <a href={`tel:${supplier.phone}`} style={{ color: 'var(--color-primary)' }} className="hover:underline">
                  {supplier.phone}
                </a>
              </InfoRow>
            )}

            {supplier.email && (
              <InfoRow label={t('suppliers.email')}>
                <a href={`mailto:${supplier.email}`} style={{ color: 'var(--color-primary)' }} className="hover:underline">
                  {supplier.email}
                </a>
              </InfoRow>
            )}

            {supplier.bank_account && (
              <InfoRow label={t('suppliers.bankAccount')}>
                <span className="flex items-center gap-1.5" style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                  <Building2 size={13} style={{ color: 'var(--color-text-secondary)' }} /> {supplier.bank_account}
                </span>
              </InfoRow>
            )}

            {supplier.notes && (
              <InfoRow label={t('suppliers.notes')}>
                <span className="whitespace-pre-wrap">{supplier.notes}</span>
              </InfoRow>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={t('suppliers.deactivateConfirm')}
        message={t('suppliers.deactivateMessage')}
        confirmLabel={t('suppliers.deactivate')}
        loading={updateMutation.isPending}
        onConfirm={handleDeactivate}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
