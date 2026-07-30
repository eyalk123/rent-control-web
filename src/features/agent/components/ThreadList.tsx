import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatPanel } from '../PortfolioChatContext';
import { useConversations, useDeleteConversation } from '../queries';

export function ThreadList() {
  const { t } = useTranslation();
  const { openThread, activeConversationId, newChat } = useChatPanel();
  const { data: conversations, isLoading } = useConversations();
  const del = useDeleteConversation();

  const handleDelete = (id: number) => {
    if (!window.confirm(t('agent.deleteConfirm'))) return;
    del.mutate(id, {
      onSuccess: () => {
        // If we deleted the thread that's currently open, clear it back to a new chat.
        if (id === activeConversationId) newChat();
      },
    });
  };

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">…</p>;
  }
  if (!conversations || conversations.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">
        {t('agent.historyEmpty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {conversations.map((c) => (
        <div
          key={c.id}
          className="flex items-center rounded-[var(--radius-card)] transition-colors hover:bg-[var(--color-input-filled-background)]"
        >
          <button
            type="button"
            dir="auto"
            onClick={() => openThread(c.id)}
            className="min-w-0 flex-1 px-3 py-2.5 text-start"
          >
            <span className="line-clamp-1 text-sm text-[var(--color-text-primary)]">
              {c.title || t('agent.title')}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
              {new Date(c.updated_at).toLocaleDateString()}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c.id)}
            aria-label={t('agent.delete')}
            className="me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-exp-bg)] hover:text-[var(--color-exp-fg)]"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
