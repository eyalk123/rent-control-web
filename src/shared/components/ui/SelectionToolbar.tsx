import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import { TriStateCheckbox } from './TriStateCheckbox';

interface Props {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  deleting: boolean;
  onToggleAll: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

/**
 * Header bar shown while a list is in select mode: a select-all tri-state
 * checkbox, the selected count, and Cancel / Delete actions. Mirrors the
 * mobile `SelectionHeader`.
 */
export function SelectionToolbar({
  allSelected, someSelected, selectedCount, deleting, onToggleAll, onDelete, onCancel,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={onToggleAll}
        className="flex items-center gap-2.5 text-[13px] font-medium"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-primary)' }}
      >
        <TriStateCheckbox checked={allSelected} indeterminate={someSelected} />
        {t('bulkDelete.selected', { count: selectedCount })}
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <X size={14} /> {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || selectedCount === 0}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-error)' }}
        >
          <Trash2 size={14} /> {t('bulkDelete.delete', { count: selectedCount })}
        </button>
      </div>
    </div>
  );
}
