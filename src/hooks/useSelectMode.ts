import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/components/ui/Toast';

interface UseSelectModeParams<T extends { id: number }> {
  /** The currently visible / filtered items. Drives select-all semantics. */
  items: T[];
  /** Deletes a single item by id. Called once per selected id. */
  deleteItem: (id: number) => Promise<unknown>;
  /** Invalidate / refetch after the batch completes. */
  onDeleted: () => void | Promise<void>;
}

/**
 * Generic bulk-selection + delete state, mirroring the mobile
 * `useTransactionSelectMode` pattern: enter select mode, toggle items, delete the
 * selection in a loop tallying success/failure, then surface a toast.
 */
export function useSelectMode<T extends { id: number }>({
  items,
  deleteItem,
  onDeleted,
}: UseSelectModeParams<T>) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));
  const someSelected = !allSelected && items.some((it) => selectedIds.has(it.id));
  const selectedCount = selectedIds.size;

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      items.length > 0 && items.every((it) => prev.has(it.id))
        ? new Set()
        : new Set(items.map((it) => it.id)),
    );
  }, [items]);

  /** Enter select mode, optionally pre-selecting an item (e.g. from long-press). */
  const enter = useCallback((id?: number) => {
    setIsSelectMode(true);
    if (id != null) setSelectedIds(new Set([id]));
  }, []);

  const cancel = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const requestDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setConfirmOpen(true);
  }, [selectedIds]);

  const performDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteItem(id);
        success++;
      } catch {
        failed++;
      }
    }
    await onDeleted();
    setDeleting(false);
    setConfirmOpen(false);
    setIsSelectMode(false);
    setSelectedIds(new Set());
    if (failed > 0) {
      showToast(t('bulkDelete.partialError', { success, failed }), 'error');
    } else {
      showToast(t('bulkDelete.success'), 'success');
    }
  }, [selectedIds, deleteItem, onDeleted, showToast, t]);

  return useMemo(
    () => ({
      isSelectMode,
      selectedIds,
      selectedCount,
      deleting,
      allSelected,
      someSelected,
      confirmOpen,
      toggle,
      toggleAll,
      enter,
      cancel,
      requestDelete,
      performDelete,
      setConfirmOpen,
    }),
    [
      isSelectMode, selectedIds, selectedCount, deleting, allSelected, someSelected,
      confirmOpen, toggle, toggleAll, enter, cancel, requestDelete, performDelete,
    ],
  );
}
