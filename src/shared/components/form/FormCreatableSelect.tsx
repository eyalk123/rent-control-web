import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus } from 'lucide-react';

type Props<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  options: string[];
  placeholder?: string;
  createLabel: string;
  createModalTitle: string;
  createModalPlaceholder?: string;
  error?: string;
};

export function FormCreatableSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  createLabel,
  createModalTitle,
  createModalPlaceholder,
  error,
}: Props<TFieldValues>) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => {
        const displayError = error ?? fieldError?.message;
        const currentValue = value as string | undefined | null;

        const handleConfirm = () => {
          const trimmed = newName.trim();
          if (!trimmed) return;
          onChange(trimmed);
          setModalOpen(false);
          setNewName('');
        };

        const handleModalClose = () => {
          setModalOpen(false);
          setNewName('');
        };

        return (
          <div className="flex flex-col gap-1.5">
            {label && (
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                {label}
              </label>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={`flex items-center justify-between w-full rounded-xl bg-[var(--color-input-bg)] border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${displayError ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'} ${!currentValue ? 'text-[var(--color-placeholder)]' : 'text-[var(--color-text-primary)]'}`}
                >
                  <span className="truncate">{currentValue || placeholder || ''}</span>
                  <ChevronDown size={16} className="text-[var(--color-text-secondary)] shrink-0 ms-2" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline)] shadow-lg py-1"
                  align="start"
                  sideOffset={4}
                >
                  {options.map((owner) => (
                    <DropdownMenu.Item
                      key={owner}
                      onSelect={() => onChange(owner)}
                      className="px-3.5 py-2 text-sm text-[var(--color-text-primary)] cursor-pointer outline-none hover:bg-[var(--color-outline)] focus:bg-[var(--color-outline)]"
                    >
                      {owner}
                    </DropdownMenu.Item>
                  ))}

                  {options.length > 0 && (
                    <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-outline)]" />
                  )}

                  <DropdownMenu.Item
                    onSelect={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm text-[var(--color-primary)] cursor-pointer outline-none hover:bg-[var(--color-outline)] focus:bg-[var(--color-outline)]"
                  >
                    <Plus size={14} />
                    {createLabel}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {displayError && (
              <p className="text-xs text-[var(--color-error)]">{t(displayError, { defaultValue: displayError })}</p>
            )}

            <Dialog.Root open={modalOpen} onOpenChange={(open) => { if (!open) handleModalClose(); }}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-6 shadow-xl">
                  <Dialog.Title className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                    {createModalTitle}
                  </Dialog.Title>
                  <input
                    type="text"
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                    placeholder={createModalPlaceholder}
                    className="w-full rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-primary)] mb-5"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!newName.trim()}
                      className="px-4 py-2 text-sm font-medium rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-40 transition-opacity"
                    >
                      {t('common.add')}
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        );
      }}
    />
  );
}
