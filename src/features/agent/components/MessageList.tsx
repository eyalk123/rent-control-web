import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatPanel } from '../PortfolioChatContext';
import { ChatMessage } from './ChatMessage';
import { StarterPrompts } from './StarterPrompts';

export function MessageList() {
  const { t } = useTranslation();
  const { messages, status, activity } = useChatPanel();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activity]);

  if (messages.length === 0) return <StarterPrompts />;

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {status === 'streaming' && activity && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
          {/* falls back to a generic label for any tool without its own string */}
          <span>{t([`agent.tool.${activity}`, 'agent.tool.default'])}</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
