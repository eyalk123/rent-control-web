import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBlob, ref } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { storage } from '@/core/auth/firebase';
import { useToast } from '@/shared/components/ui/Toast';

/**
 * Stored files are read through the Firebase SDK as the signed-in user, so `storage.rules`
 * decides who may read them.
 *
 * The values in the database are Firebase *download URLs*: they carry a token that bypasses
 * those rules, never expires, and works for anyone holding the link. Reading through the SDK
 * is the first step of retiring them (PLATFORM.md §18) — once every client reads this way,
 * the tokens can be revoked and the columns can hold bare storage paths. Both shapes are
 * accepted here for that reason.
 */

const DOWNLOAD_HOST = 'firebasestorage.googleapis.com';
// Mirror of the upload path shape: `{entityType}/{ownerId}/{uuid}/{filename}`.
const STORAGE_PATH = /^(properties|renters|transactions)\/[^/]+\/[^/]+\/.+/;

/** The Storage path a stored value points at, or null when it is not one of our files
 *  (a house preset, a local `blob:` preview, a mock-API URL). */
export function storagePathOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (url.hostname !== DOWNLOAD_HOST) return null;
      const at = url.pathname.indexOf('/o/');
      return at === -1 ? null : decodeURIComponent(url.pathname.slice(at + 3));
    } catch {
      return null;
    }
  }
  return STORAGE_PATH.test(value) ? value : null;
}

let fallbackReported = false;

/** While download tokens still exist, a failed SDK read falls back to the stored link so the
 *  file still shows. Reported once per session: a fallback means the SDK path is broken (the
 *  bucket's CORS config is the usual cause), and the fallback stops working the day the
 *  tokens are revoked. */
function reportFallback(error: unknown): void {
  if (fallbackReported) return;
  fallbackReported = true;
  Sentry.captureMessage('Stored file read failed; fell back to its download link', {
    level: 'warning',
    // The error's code only — its message quotes the storage path, which names a file.
    extra: { code: (error as { code?: string })?.code ?? 'unknown' },
  });
}

function canFallBack(value: string | null | undefined): value is string {
  return !!value && value.startsWith('https://');
}

/** A displayable `src` for a stored file value: stored files are fetched as the signed-in
 *  user and shown through an object URL; anything else passes through unchanged. Null while
 *  loading. */
export function useStoredFileSrc(value: string | null | undefined): string | null {
  const path = storagePathOf(value);
  const { data, isError, error } = useQuery({
    queryKey: ['stored-file', path],
    queryFn: () => getBlob(ref(storage, path!)),
    enabled: !!path,
    staleTime: Infinity,
    retry: false,
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!data) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(data);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data]);

  useEffect(() => {
    if (isError && canFallBack(value)) reportFallback(error);
  }, [isError, error, value]);

  if (!path) return value ?? null;
  if (isError) return canFallBack(value) ? value : null;
  return objectUrl;
}

/** `openStoredFile` with the failure shown to the user. */
export function useOpenStoredFile(): (value: string) => void {
  const { t } = useTranslation();
  const { showToast } = useToast();
  return (value) => {
    openStoredFile(value).catch(() => showToast(t('common.fileOpenFailed'), 'error'));
  };
}

// Types a browser tab can show; anything else (Word documents) is downloaded instead.
const VIEWABLE = /\.(pdf|png|jpe?g|gif|webp)$/i;

/** Open a stored file for the signed-in user: in a new tab when the browser can show it,
 *  as a download otherwise. Call it straight from the click handler — the tab is opened
 *  before the fetch so the browser's popup blocker still counts it as user-initiated. */
export async function openStoredFile(value: string): Promise<void> {
  const path = storagePathOf(value);
  if (!path) {
    window.open(value, '_blank', 'noopener,noreferrer');
    return;
  }
  const name = path.split('/').pop() ?? 'file';
  const tab = VIEWABLE.test(name) ? window.open('', '_blank') : null;
  if (tab) tab.opener = null;
  try {
    const url = URL.createObjectURL(await getBlob(ref(storage, path)));
    if (tab) {
      tab.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
    }
    // Long enough for the tab or the download to have read it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (canFallBack(value)) {
      reportFallback(error);
      if (tab) tab.location.href = value;
      else window.open(value, '_blank', 'noopener,noreferrer');
    } else {
      tab?.close();
      throw error;
    }
  }
}
