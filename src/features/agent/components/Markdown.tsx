import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

// Assistant answers arrive as Markdown — tables (via remark-gfm), bold, lists, headings.
// We render them with a hand-styled element map (theme-aware via the app's CSS vars) instead
// of a `prose` plugin, so it stays lean and matches the chat. remark-breaks keeps single
// newlines as line breaks, matching the plain-text bubble this replaced. No rehype-raw: raw
// HTML in model output stays escaped and link URLs are sanitized, so nothing can inject markup.
const components: Components = {
  p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-primary)] underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 ps-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 ps-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="mt-2 mb-1 text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-s-2 border-[var(--color-outline)] ps-3 text-[var(--color-text-secondary)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-[var(--color-outline)]" />,
  // Wide tables scroll inside the bubble instead of overflowing the ~460px drawer.
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-input-filled-background)]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--color-outline)] px-2 py-1 text-start font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[var(--color-outline)] px-2 py-1 text-start">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-[var(--radius-card)] bg-[var(--color-input-filled-background)] p-3 text-xs">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    // Inline code (no language class, single line) gets a subtle chip; fenced blocks render
    // bare — their <pre> parent already provides the box.
    const isInline = !className && !String(children).includes('\n');
    if (isInline) {
      return (
        <code className="rounded bg-[var(--color-input-filled-background)] px-1 py-0.5 font-mono text-[0.85em]">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
};

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {children}
    </ReactMarkdown>
  );
});
