import { Markdown } from './Markdown';
import { SourceChips } from './SourceChips';
import type { ChatDisplayMessage } from '../types';

/** A chat bubble. `dir="auto"` lets each message render in its own script's direction
 *  (Hebrew RTL, English LTR) regardless of the app language. Assistant answers render as
 *  Markdown (tables, bold, lists); user input and errors stay plain text — we never
 *  Markdown-render what the user typed. */
export function ChatMessage({ message }: { message: ChatDisplayMessage }) {
  const isUser = message.role === 'user';
  // Markdown only for a real assistant answer; the placeholder/error stay plain text.
  const asMarkdown = !isUser && !message.error && !!message.text;
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={isUser ? 'max-w-[85%]' : 'w-full'}>
        <div
          dir="auto"
          className={`rounded-[var(--radius-card)] px-3.5 py-2.5 text-sm leading-relaxed ${
            asMarkdown ? '' : 'whitespace-pre-wrap'
          } ${
            isUser
              ? 'bg-[var(--color-primary)] text-white'
              : message.error
                ? 'bg-[var(--color-exp-bg)] text-[var(--color-exp-fg)]'
                : 'bg-[var(--color-input-filled-background)] text-[var(--color-text-primary)]'
          }`}
        >
          {asMarkdown ? (
            <Markdown>{message.text}</Markdown>
          ) : (
            message.text || (message.streaming ? <span className="opacity-50">…</span> : '')
          )}
        </div>
        {!isUser && !message.error && <SourceChips sources={message.sources} />}
      </div>
    </div>
  );
}
