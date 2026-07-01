import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/** One field the document scanner was unsure about — keyed by its RHF field name so a
 *  form control can decorate itself. Structurally a subset of document-scan's `ReviewItem`,
 *  but defined here so shared form components don't depend on the feature. */
export interface FieldReviewEntry {
  formKey: string;
  source: string | null;
  confidence?: string;
}

interface FieldReview {
  source: string | null;
  confidence?: string;
}

interface Ctx {
  get: (name?: string) => FieldReview | undefined;
  dismiss: (name: string) => void;
}

const FieldReviewContext = createContext<Ctx | null>(null);

/** Wraps a form so its fields can flag values the scanner pre-filled with low confidence.
 *  A field's marker clears once the user edits it (the value has been verified). */
export function FieldReviewProvider({ items, children }: { items?: FieldReviewEntry[]; children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const map = useMemo(() => {
    const m = new Map<string, FieldReview>();
    for (const it of items ?? []) {
      if (it.formKey) m.set(it.formKey, { source: it.source, confidence: it.confidence });
    }
    return m;
  }, [items]);

  // A fresh extraction (new items) starts with nothing dismissed.
  useEffect(() => { setDismissed(new Set()); }, [items]);

  const value = useMemo<Ctx>(
    () => ({
      get: (name) => (name && !dismissed.has(name) ? map.get(name) : undefined),
      dismiss: (name) =>
        setDismissed((prev) => (prev.has(name) ? prev : new Set(prev).add(name))),
    }),
    [map, dismissed],
  );

  return <FieldReviewContext.Provider value={value}>{children}</FieldReviewContext.Provider>;
}

/** A form control reads this by its field name; non-undefined means "flag this field". */
export function useFieldReview(name?: string): FieldReview | undefined {
  return useContext(FieldReviewContext)?.get(name);
}

/** Call when the user edits a flagged field so its marker clears. */
export function useDismissFieldReview(): ((name: string) => void) | undefined {
  return useContext(FieldReviewContext)?.dismiss;
}

/** Inline notice shown beneath a flagged field: a "double-check this auto-filled value" prompt
 *  plus the exact line from the lease the value came from, so the user can verify it in place. */
export function FieldReviewNotice({ source }: { source: string | null }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
      style={{ background: 'var(--color-warning-bg, rgba(234,179,8,0.12))' }}
    >
      <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-medium" style={{ color: 'var(--color-warning)' }}>{t('documentScan.doubleCheck')}</span>
        {source && (
          <span className="mt-0.5 block break-words" style={{ color: 'var(--color-text-secondary)' }}>
            {t('documentScan.foundIn', { snippet: source })}
          </span>
        )}
      </span>
    </div>
  );
}
