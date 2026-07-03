import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Pencil, Plus, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Trigger label, e.g. "Add property". */
  label: string;
  onManual: () => void;
  onScan: () => void;
}

/** Primary "Add" button that opens a small chooser: enter manually, or scan a lease.
 *  Scanning is an input method of Add, not a separate action. */
export function AddMenu({ label, onManual, onScan }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <DropdownMenu.Root dir={i18n.dir()}>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity outline-none"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={14} /> {label}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[11rem] overflow-hidden rounded-xl border p-1 shadow-lg"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)' }}
        >
          <DropdownMenu.Item
            onSelect={onManual}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer outline-none data-[highlighted]:bg-[var(--color-outline)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Pencil size={15} style={{ color: 'var(--color-text-secondary)' }} />
            {t('documentScan.addManually')}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onScan}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer outline-none data-[highlighted]:bg-[var(--color-outline)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ScanLine size={15} style={{ color: 'var(--color-text-secondary)' }} />
            {t('documentScan.scanLease')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
