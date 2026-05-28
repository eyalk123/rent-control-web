import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useCreateExpenseCategory } from '@/features/transactions/queries';
import type { ExpenseCategory } from '@/shared/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  onCreated: (category: ExpenseCategory) => void;
}

export function AddCategoryModal({ opened, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const createCategory = useCreateExpenseCategory();

  if (!opened) return null;

  const handleConfirm = async () => {
    if (!name.trim()) return;
    try {
      const category = await createCategory.mutateAsync(name.trim());
      onCreated(category);
      setName('');
      onClose();
    } catch {
      // parent toast handles errors
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('categories.addTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onClose();
          }}
          placeholder={t('categories.namePlaceholder')}
          className="w-full h-[42px] rounded-xl px-3.5 text-sm outline-none mb-4"
          style={{
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-input-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-[9px] text-[13px] font-medium"
            style={{
              border: '1px solid var(--color-outline)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-surface)',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!name.trim() || createCategory.isPending}
            className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {createCategory.isPending ? '...' : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
