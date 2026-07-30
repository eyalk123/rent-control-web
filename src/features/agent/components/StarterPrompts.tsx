import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatPanel } from '../PortfolioChatContext';

/** Empty-conversation state: a hint + localized quick questions that send on tap. */
export function StarterPrompts() {
  const { t } = useTranslation();
  const { send } = useChatPanel();
  const starters = t('agent.starters', { returnObjects: true }) as string[];

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-input-filled-background)] text-[var(--color-primary)]">
        <MessageSquare size={22} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-[var(--color-text-primary)]">{t('agent.emptyTitle')}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('agent.emptyHint')}</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {(Array.isArray(starters) ? starters : []).map((prompt, i) => (
          <button
            key={i}
            type="button"
            dir="auto"
            onClick={() => send(prompt)}
            className="rounded-[var(--radius-card)] border border-[var(--color-outline)] px-3 py-2 text-start text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-input-filled-background)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
