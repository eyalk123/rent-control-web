import type { SourceRef, SourceRefType } from '../types';

// The agent tags sources inline as [[type:id|label]] (see backend SYSTEM_PROMPT). We strip
// these out of the displayed prose and surface them as tappable chips instead.
const MARKER = /\[\[(renter|property|transaction):(\d+)\|([^\]]*)\]\]/g;
// A marker still being streamed (opening "[[" with no closing "]]" yet) — hide it so the
// user never sees a half-written tag flash by.
const PARTIAL_MARKER = /\[\[[^\]]*$/;

/**
 * Split raw agent text into clean prose + de-duplicated source refs.
 * Safe to call on a partially-streamed buffer: complete markers become chips, an
 * in-progress marker at the very end is hidden until it finishes.
 */
export function parseCitations(raw: string): { text: string; refs: SourceRef[] } {
  const refs: SourceRef[] = [];
  const seen = new Set<string>();

  let text = raw.replace(MARKER, (_match, type: string, id: string, label: string) => {
    const key = `${type}:${id}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type: type as SourceRefType, id: Number(id), label: label.trim() });
    }
    return '';
  });

  text = text
    .replace(PARTIAL_MARKER, '')
    // tidy whitespace a removed marker may have left behind
    .replace(/[ \t]+([.,;:!?…])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return { text, refs };
}
