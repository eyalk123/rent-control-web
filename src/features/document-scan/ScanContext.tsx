import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/core/api/client';
import { useExtractLease } from './queries';
import { mapExtraction, type MappedExtraction, type MappedRenter } from './utils/mapExtraction';

/**
 * Global owner of the "scan a lease" lifecycle (request + result), lifted out of the
 * individual list/detail pages so an in-flight — or finished-but-unopened — scan is never
 * thrown away when its drawer is dismissed. Dismissing the scan/summary drawer *minimizes*
 * the session to a floating pill (see ScanPill); tapping the pill restores the drawer. On
 * "Continue" the finalized result is handed off to the origin page (which owns the
 * downstream verification forms) and the session clears.
 */

export type ScanTarget = 'property' | 'renter';
export type ScanStatus = 'picking' | 'scanning' | 'ready' | 'error';
/** Which scan surface is currently showing. `minimized` = pill only; `handoff` = the result
 *  is being passed to the origin page's form and the session is about to clear. */
export type ScanView = 'scan' | 'summary' | 'minimized' | 'handoff' | null;

/** The finalized extraction, handed to the origin page to drive its verification forms. */
export interface ScanResult {
  logId: number;
  mapped: MappedExtraction;
  /** Per-renter queue with the joint-rent split applied (finalized on the summary drawer). */
  renters: MappedRenter[];
  /** The document actually sent (a merged PDF when several images were captured). */
  file: File;
}

interface ScanSession {
  target: ScanTarget;
  /** For a renter scanned from a property's page: the property it belongs to. */
  propertyId?: number;
  /** Route to return to so the correct page opens its form after "Continue". */
  originPath: string;
  status: ScanStatus;
  error?: string;
  result?: ScanResult;
}

export interface ScanBeginOptions {
  target: ScanTarget;
  propertyId?: number;
  originPath: string;
}

interface ScanContextValue {
  session: ScanSession | null;
  view: ScanView;
  /** Open the scan drawer to pick a file (target/origin captured for the handoff). */
  begin: (opts: ScanBeginOptions) => void;
  /** Fire the (abortable) extraction for the already-merged document. */
  startExtraction: (file: File) => Promise<void>;
  /** Scrim/cancel on the scan drawer: keep an in-flight scan alive as a pill, else discard. */
  dismissScan: () => void;
  /** Scrim on the summary drawer: minimize to a pill. */
  dismissSummary: () => void;
  /** Pill tap: restore whichever drawer the session belongs to. */
  restore: () => void;
  /** Pill ✕: abort the request and drop the session. */
  cancel: () => void;
  /** Summary "Continue": store the finalized renters and hand off to the origin page. */
  continueToForm: (renters: MappedRenter[]) => void;
  /** Origin page picks up the handoff result and clears the session. */
  consume: () => ScanResult | null;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const extract = useExtractLease();

  const [session, setSession] = useState<ScanSession | null>(null);
  const [view, setView] = useState<ScanView>(null);

  // Refs mirror the latest state so the async extraction can read/guard against a session
  // that was cleared (cancelled) or a drawer that was minimized while it ran.
  const sessionRef = useRef<ScanSession | null>(null);
  const viewRef = useRef<ScanView>(null);
  const abortRef = useRef<AbortController | null>(null);
  sessionRef.current = session;
  viewRef.current = view;

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSession(null);
    setView(null);
  }, []);

  const begin = useCallback((opts: ScanBeginOptions) => {
    // A new scan replaces any prior one (the UI only supports one at a time).
    abortRef.current?.abort();
    abortRef.current = null;
    setSession({ ...opts, status: 'picking' });
    setView('scan');
  }, []);

  const startExtraction = useCallback(async (file: File) => {
    if (!sessionRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setSession((s) => (s ? { ...s, status: 'scanning', error: undefined } : s));

    try {
      const { logId, extraction } = await extract.mutateAsync({ file, signal: controller.signal });
      // The user cancelled (session cleared) or started another scan while this ran.
      if (abortRef.current !== controller || !sessionRef.current) return;
      const mapped = mapExtraction(extraction);
      setSession((s) => (s ? { ...s, status: 'ready', result: { logId, mapped, renters: mapped.renters, file } } : s));
      // If they minimized mid-scan, keep the pill (it flips to "ready"); otherwise reveal the summary.
      setView((v) => (v === 'minimized' ? 'minimized' : 'summary'));
    } catch (err) {
      if (controller.signal.aborted || abortRef.current !== controller || !sessionRef.current) return;
      setSession((s) => (s ? { ...s, status: 'error', error: getApiErrorMessage(err, t('error.extractionFailed')) } : s));
    }
  }, [extract, t]);

  const dismissScan = useCallback(() => {
    // Nothing worth rescuing before the request is in flight (or after an error) — just close.
    if (sessionRef.current?.status === 'scanning') setView('minimized');
    else clear();
  }, [clear]);

  const dismissSummary = useCallback(() => setView('minimized'), []);

  const restore = useCallback(() => {
    setView(sessionRef.current?.status === 'ready' ? 'summary' : 'scan');
  }, []);

  const continueToForm = useCallback((renters: MappedRenter[]) => {
    const s = sessionRef.current;
    if (!s?.result) return;
    setSession({ ...s, result: { ...s.result, renters } });
    setView('handoff');
    navigate(s.originPath);
  }, [navigate]);

  const consume = useCallback(() => {
    const result = sessionRef.current?.result ?? null;
    // Handoff done — the origin page now owns the result via its own local state.
    abortRef.current = null;
    setSession(null);
    setView(null);
    return result;
  }, []);

  const value = useMemo<ScanContextValue>(() => ({
    session, view, begin, startExtraction, dismissScan, dismissSummary, restore, cancel: clear, continueToForm, consume,
  }), [session, view, begin, startExtraction, dismissScan, dismissSummary, restore, clear, continueToForm, consume]);

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScanSession() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScanSession must be used inside ScanProvider');
  return ctx;
}
