import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { translateCategory } from '@/shared/utils/categories';
import { AddCategoryModal } from './AddCategoryModal';
import type { ExpenseCategory } from '@/shared/types';

interface Props {
  label?: string;
  categories: ExpenseCategory[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

export function CategoryMultiSelect({ label, categories, selectedIds, onChange, error }: Props) {
  const { t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {label}
          </label>
        )}
        {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
                style={{
                  background: selected ? 'var(--color-primary)' : 'var(--color-input-bg)',
                  color: selected ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {c.name ?? (c.key ? translateCategory(c.key, t) : String(c.id))}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1 transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
            }}
          >
            <Plus size={13} />
            {t('categories.add')}
          </button>
        </div>
      </div>
      <AddCategoryModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={(cat) => onChange([...selectedIds, cat.id])}
      />
    </>
  );
}
