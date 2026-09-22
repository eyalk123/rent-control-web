// Types for the Portfolio Chat Agent ("Ask RentVance").

export type SourceRefType = 'renter' | 'property' | 'transaction';

/** A tappable source chip parsed from a `[[type:id|label]]` marker in the answer. */
export interface SourceRef {
  type: SourceRefType;
  id: number;
  label: string;
}

export type ChatRole = 'user' | 'assistant';

/** A message as rendered in the panel (prose with citation markers already stripped). */
export interface ChatDisplayMessage {
  id: string;
  role: ChatRole;
  text: string;
  sources: SourceRef[];
  /** Assistant message currently receiving streamed deltas. */
  streaming?: boolean;
  error?: boolean;
}

/** SSE events emitted by POST /agent/chat (payload carries its own `type`). */
export type AgentEvent =
  | { type: 'conversation'; conversation_id: number }
  | { type: 'tool'; name: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; status: string; message: string; tool_calls: string[] }
  | { type: 'error'; detail: string };

export interface AgentStatus {
  /** Whether the assistant is configured on the backend at all. */
  enabled: boolean;
  /**
   * Whether this account's plan includes it. Separate from `enabled` on purpose: a free
   * account sees the assistant, locked, rather than not seeing it — a feature nobody can
   * see is a feature nobody upgrades for.
   */
  entitled?: boolean;
  /** The cheapest plan that includes it, when this one does not. */
  required_plan?: string | null;
}

export interface ConversationSummary {
  id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/** One stored turn from GET /agent/conversations/{id}. `content` is a string (user text)
 *  or a list of content blocks (assistant text / tool_use, or tool_result). */
export interface StoredMessage {
  id: number;
  role: ChatRole;
  content: unknown;
  created_at: string;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: StoredMessage[];
}
