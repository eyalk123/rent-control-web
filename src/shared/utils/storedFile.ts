import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBlob, ref } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import { storage } from '@/core/auth/firebase';
import { useToast } from '@/shared/components/ui/Toast';

/**
 * Stored files are read through the Firebase SDK as the signed-in user, so `storage.rules`
 * decides who may read them. The database holds each file's bare storage path — never a
 * download URL, whose token opened the file for anyone with the link (PLATFORM.md §18).
 * A failed read (the bucket's CORS config is the usual cause) has nothing to fall back to.
 */

// Mirror of the upload path shape: `{entityType}/{ownerId}/{uuid}/{filename}`.
const STORAGE_PATH = /^(properties|renters|transactions)\/[^/]+\/[^/]+\/.+/;

/** The Storage path a stored value points at, or null when it is not one of our files
 *  (a house preset, a local `blob:` preview, a mock-API URL). */
export function storagePathOf(value: string | null | undefined): string | null {
  return value && STORAGE_PATH.test(value) ? value : null;
}

/** A displayable `src` for a stored file value: stored files are fetched as the signed-in
 *  user and shown through an object URL; anything else passes through unchanged. Null while
 *  loading. */
export function useStoredFileSrc(value: string | null | undefined): string | null {
  const path = storagePathOf(value);
  const { data } = useQuery({
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

  if (!path) return value ?? null;
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
    tab?.close();
    throw error;
  }
}
