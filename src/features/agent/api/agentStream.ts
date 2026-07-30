import type { AgentEvent } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface StreamChatArgs {
  message: string;
  conversationId: number | null;
  getToken: () => Promise<string | null>;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}

/** Non-2xx from /agent/chat (e.g. 429 daily limit, 401 expired, 503 disabled). */
export class AgentHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AgentHttpError';
  }
}

/**
 * POST /agent/chat and consume the SSE stream. Axios can't stream in the browser, so this
 * uses raw fetch + ReadableStream. Each `data:` frame is a JSON event ({type, ...}); we
 * buffer across chunks because a frame can be split mid-read.
 */
export async function streamAgentChatHttp({
  message,
  conversationId,
  getToken,
  signal,
  onEvent,
}: StreamChatArgs): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });

  if (!res.ok || !res.body) {
    // Raw fetch bypasses the axios 401 interceptor; surface a typed error for the caller.
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new AgentHttpError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const event = parseFrame(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (event) onEvent(event);
    }
  }
  const tail = parseFrame(buffer);
  if (tail) onEvent(tail);
}

function parseFrame(frame: string): AgentEvent | null {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return null;
  try {
    return JSON.parse(data) as AgentEvent;
  } catch {
    return null;
  }
}
