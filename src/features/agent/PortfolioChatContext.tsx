import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { useAppAuth } from '@/core/auth/AuthContext';
import { getConversation, streamAgentChat } from './api/agentApi';
import { AgentHttpError } from './api/agentStream';
import { useInvalidateConversations } from './queries';
import { parseCitations } from './utils/citations';
import type { ChatDisplayMessage, StoredMessage } from './types';

type ChatStatus = 'idle' | 'streaming' | 'error';
type ChatView = 'conversation' | 'history';

interface ChatPanelValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  view: ChatView;
  setView: (v: ChatView) => void;
  messages: ChatDisplayMessage[];
  activeConversationId: number | null;
  status: ChatStatus;
  /** i18n tool key for the current activity line, or null. */
  activity: string | null;
  send: (text: string) => void;
  stop: () => void;
  newChat: () => void;
  openThread: (id: number) => Promise<void>;
}

const ChatPanelContext = createContext<ChatPanelValue | null>(null);

let _uid = 0;
const uid = () => `m${++_uid}`;

type Block = { type?: string; text?: string };

/** Map stored turns (raw content blocks) into rendered messages: user strings and assistant
 *  text; tool_result turns (user role, array content) are skipped. */
function storedToDisplay(messages: StoredMessage[]): ChatDisplayMessage[] {
  const out: ChatDisplayMessage[] = [];
  for (const m of messages) {
    if (m.role === 'user' && typeof m.content === 'string') {
      out.push({ id: `s${m.id}`, role: 'user', text: m.content, sources: [] });
    } else if (m.role === 'assistant' && Array.isArray(m.content)) {
      const text = (m.content as Block[])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      if (text.trim()) {
        const { text: prose, refs } = parseCitations(text);
        out.push({ id: `s${m.id}`, role: 'assistant', text: prose, sources: refs });
      }
    }
  }
  return out;
}

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { getToken } = useAppAuth();
  const invalidateConversations = useInvalidateConversations();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ChatView>('conversation');
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [activity, setActivity] = useState<string | null>(null);

  // Refs so async callbacks read current values without re-subscribing.
  const statusRef = useRef<ChatStatus>('idle');
  const convoIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const patchMessage = useCallback((id: string, patch: Partial<ChatDisplayMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const setBusy = useCallback((s: ChatStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || statusRef.current === 'streaming') return;

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', text: trimmed, sources: [] },
        { id: assistantId, role: 'assistant', text: '', sources: [], streaming: true },
      ]);
      setBusy('streaming');
      setActivity(null);

      const controller = new AbortController();
      abortRef.current = controller;
      let raw = '';

      streamAgentChat({
        message: trimmed,
        conversationId: convoIdRef.current,
        getToken,
        signal: controller.signal,
        onEvent: (ev) => {
          switch (ev.type) {
            case 'conversation':
              convoIdRef.current = ev.conversation_id;
              setActiveConversationId(ev.conversation_id);
              break;
            case 'tool':
              setActivity(ev.name);
              break;
            case 'text': {
              setActivity(null); // answer is arriving — drop the "checking…" line
              raw += ev.delta;
              const { text: prose, refs } = parseCitations(raw);
              patchMessage(assistantId, { text: prose, sources: refs });
              break;
            }
            case 'done': {
              const { text: prose, refs } = parseCitations(ev.message || raw);
              patchMessage(assistantId, { text: prose, sources: refs, streaming: false });
              break;
            }
            case 'error':
              patchMessage(assistantId, {
                streaming: false,
                error: true,
                text: t('agent.errorGeneric'),
              });
              break;
          }
        },
      })
        .then(() => {
          setActivity(null);
          setBusy('idle');
          invalidateConversations();
        })
        .catch((err: unknown) => {
          setActivity(null);
          if (err instanceof DOMException && err.name === 'AbortError') {
            patchMessage(assistantId, { streaming: false });
          } else {
            const limited = err instanceof AgentHttpError && err.status === 429;
            // Report only what isn't a designed outcome. The AbortError branch above is
            // the user pressing stop; 429 is the daily cap, 401 an expired token, 503
            // the agent being switched off. Reporting those recreates exactly the noise
            // the abort branch exists to prevent. The SSE 'error' frame is likewise not
            // reported here — the backend captures that failure with the real upstream
            // stack, so a second event here would carry no information.
            const expected =
              err instanceof AgentHttpError && [401, 429, 503].includes(err.status);
            if (!expected) {
              Sentry.captureException(err, { tags: { feature: 'agent_chat' } });
            }
            patchMessage(assistantId, {
              streaming: false,
              error: true,
              text: t(limited ? 'agent.errorLimit' : 'agent.errorGeneric'),
            });
          }
          setBusy('idle');
        })
        .finally(() => {
          abortRef.current = null;
        });
    },
    [getToken, invalidateConversations, patchMessage, setBusy, t],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const resetThread = useCallback(() => {
    abortRef.current?.abort();
    convoIdRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    setActivity(null);
    setBusy('idle');
  }, [setBusy]);

  const newChat = useCallback(() => {
    resetThread();
    setView('conversation');
  }, [resetThread]);

  const openThread = useCallback(
    async (id: number) => {
      abortRef.current?.abort();
      const detail = await getConversation(id);
      convoIdRef.current = id;
      setActiveConversationId(id);
      setMessages(storedToDisplay(detail.messages));
      setActivity(null);
      setBusy('idle');
      setView('conversation');
    },
    [setBusy],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ChatPanelContext.Provider
      value={{
        isOpen, open, close, view, setView, messages, activeConversationId,
        status, activity, send, stop, newChat, openThread,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel() {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) throw new Error('useChatPanel must be used within ChatPanelProvider');
  return ctx;
}
