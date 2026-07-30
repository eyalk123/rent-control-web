import { History as HistoryIcon, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useChatPanel } from '../PortfolioChatContext';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ThreadList } from './ThreadList';

function Toolbar() {
  const { t } = useTranslation();
  const { view, setView, newChat } = useChatPanel();
  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-outline)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-input-filled-background)]';
  return (
    <div className="mb-3 flex items-center justify-between">
      <button type="button" onClick={newChat} className={pill}>
        <Plus size={13} aria-hidden="true" /> {t('agent.newChat')}
      </button>
      <button
        type="button"
        onClick={() => setView(view === 'history' ? 'conversation' : 'history')}
        className={pill}
        aria-pressed={view === 'history'}
      >
        <HistoryIcon size={13} aria-hidden="true" /> {t('agent.history')}
      </button>
    </div>
  );
}

/** The global chat surface: a slide-in Drawer with a toolbar, the message list (or thread
 *  history), and a composer footer. Mounted once in AppShell; opened from the TopBar. */
export function PortfolioChatPanel() {
  const { t } = useTranslation();
  const { isOpen, close, view } = useChatPanel();
  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={t('agent.title')}
      width={460}
      footer={view === 'conversation' ? <Composer /> : undefined}
    >
      <Toolbar />
      {view === 'history' ? <ThreadList /> : <MessageList />}
    </Drawer>
  );
}
