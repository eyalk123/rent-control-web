import { useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatPanel } from '../PortfolioChatContext';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';
import { useTour } from '@/features/onboarding/TourController';

export function Composer() {
  const { t } = useTranslation();
  const { send, stop, status } = useChatPanel();
  // Asked from here rather than from AppShell or the panel: the Drawer unmounts its
  // children when closed, so this component exists exactly when the assistant is open —
  // which is also the only time its anchor is on screen.
  useTour('chat');
  const anchorRef = useTourAnchor(ANCHORS.chatInput);
  const [text, setText] = useState('');
  const streaming = status === 'streaming';

  const submit = () => {
    const value = text.trim();
    if (!value || streaming) return;
    send(value);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div ref={anchorRef} className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        dir="auto"
        placeholder={t('agent.placeholder')}
        aria-label={t('agent.placeholder')}
        className="max-h-32 flex-1 resize-none rounded-[var(--radius-card)] border border-[var(--color-outline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:outline-none"
      />
      {streaming ? (
        <button
          type="button"
          onClick={stop}
          aria-label={t('agent.stop')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-outline)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-input-filled-background)]"
        >
          <Square size={16} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label={t('agent.send')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-primary)] text-white transition-opacity disabled:opacity-40"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
