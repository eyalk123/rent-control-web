import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AI_CONSENT_VERSION } from './aiConsent';
import { useAcceptLegal, useLegalStatus } from './queries';

/**
 * The AI consent question — see `aiConsent.ts` for why it exists and when it is asked.
 *
 * Mounted in AppShell, so it only ever runs for a signed-in user who is past ConsentGate:
 * the legal status query it reads is the one ProtectedRoute already loaded.
 */
interface AiConsentValue {
  /**
   * Resolves true once the user has allowed sending data to Anthropic — immediately if they
   * already have, otherwise after they answer the prompt. Call it before any lease scan,
   * receipt scan or assistant message; false means send nothing.
   */
  requestAiConsent: () => Promise<boolean>;
  /** Whether the prompt is showing (read by AiConsentDialog). */
  promptOpen: boolean;
  /** The prompt's answer. Allowing records it on the account first and throws if that fails. */
  answer: (allow: boolean) => Promise<void>;
}

const AiConsentContext = createContext<AiConsentValue | null>(null);

export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { data: status } = useLegalStatus(true);
  const accept = useAcceptLegal();
  const consented = status?.ai_processing?.version === AI_CONSENT_VERSION;

  const [promptOpen, setPromptOpen] = useState(false);
  const resolverRef = useRef<((allowed: boolean) => void) | null>(null);

  const requestAiConsent = useCallback((): Promise<boolean> => {
    if (consented) return Promise.resolve(true);
    // A second request while the prompt is up (a double click) gets its own answer rather
    // than orphaning the first caller's promise.
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPromptOpen(true);
    });
  }, [consented]);

  const { mutateAsync } = accept;
  const answer = useCallback(
    async (allow: boolean) => {
      // Recorded before anything is sent: if the write fails, the dialog shows an error and
      // stays open, so nothing reaches Anthropic without a stored permission.
      if (allow) await mutateAsync(['ai_processing']);
      setPromptOpen(false);
      resolverRef.current?.(allow);
      resolverRef.current = null;
    },
    [mutateAsync],
  );

  const value = useMemo(
    () => ({ requestAiConsent, promptOpen, answer }),
    [requestAiConsent, promptOpen, answer],
  );
  return <AiConsentContext.Provider value={value}>{children}</AiConsentContext.Provider>;
}

export function useAiConsent(): AiConsentValue {
  const ctx = useContext(AiConsentContext);
  if (!ctx) throw new Error('useAiConsent must be used within AiConsentProvider');
  return ctx;
}
