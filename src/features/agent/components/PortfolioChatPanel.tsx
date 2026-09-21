import { History as HistoryIcon, Lock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useChatPanel } from '../PortfolioChatContext';
import { useAgentStatus } from '../queries';
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
  const { data: status } = useAgentStatus();
  // Absent on an older backend, which means "no plan gating" — allowed, not locked.
  const entitled = status?.entitled !== false;

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={t('agent.title')}
      width={460}
      // No composer on a plan that does not include the assistant: an input box that
      // rejects whatever is typed into it is worse than no input box.
      footer={entitled && view === 'conversation' ? <Composer /> : undefined}
    >
      {entitled ? (
        <>
          <Toolbar />
          {view === 'history' ? <ThreadList /> : <MessageList />}
        </>
      ) : (
        <AgentLockedState />
      )}
    </Drawer>
  );
}

/**
 * What the panel shows on a plan without the assistant.
 *
 * Describes the feature rather than just refusing. Someone who opened this panel wants to
 * know what it does; "not on your plan" alone tells them only that they cannot have it.
 */
function AgentLockedState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <span
        className="flex items-center justify-center rounded-[14px]"
        style={{
          width: 52,
          height: 52,
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <Lock size={22} strokeWidth={2.2} />
      </span>
      <h3
        className="mt-4 text-[17px] font-bold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('subscription.agentLocked.heading')}
      </h3>
      <p
        className="mt-2 text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '38ch' }}
      >
        {t('subscription.agentLocked.body')}
      </p>
      <Link
        to="/settings/subscription"
        className="mt-6 h-10 px-5 flex items-center rounded-[9px] text-[14px] font-semibold"
        style={{
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          textDecoration: 'none',
        }}
      >
        {t('subscription.agentLocked.cta')}
      </Link>
    </div>
  );
}
