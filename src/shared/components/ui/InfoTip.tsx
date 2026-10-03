import { useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';
import i18n from '@/core/i18n';

interface Props {
  /** Accessible name for the icon button, e.g. "What is revenue recognition?". */
  label: string;
  children: ReactNode;
}

/**
 * A small (i) beside a control that explains it.
 *
 * A Popover rather than a tooltip because hover does not exist on touch: it opens on hover
 * for a mouse, and on tap or keyboard focus for everyone else. The short close delay lets
 * the pointer cross the gap from the icon into the bubble without it vanishing.
 */
export function InfoTip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
          onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0 transition-opacity hover:opacity-100 opacity-70 outline-none focus-visible:ring-2"
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'help' }}
        >
          <Info size={15} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={i18n.dir()}
          side="bottom"
          align="center"
          sideOffset={6}
          collisionPadding={16}
          onPointerEnter={show}
          onPointerLeave={hide}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-[18rem] rounded-xl border px-3.5 py-3 text-[12.5px] leading-relaxed shadow-lg"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)', color: 'var(--color-text-primary)' }}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
