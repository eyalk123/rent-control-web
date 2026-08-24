import * as Sentry from '@sentry/react';

import apiClient from '@/core/api/client';

/** Fetch a binary endpoint and save it to disk via a temporary Blob URL.
 *
 *  Shared by the report exports and the full data export. `timeout` is generous by default —
 *  these responses are generated on demand and can take a while. */
export async function downloadFile(
  endpoint: string,
  filename: string,
  options: { params?: Record<string, unknown>; timeout?: number } = {},
): Promise<void> {
  const response = await apiClient.get<Blob>(endpoint, {
    params: options.params,
    responseType: 'blob',
    timeout: options.timeout ?? 60000,
  });

  // The request itself is reported by the axios interceptor if it fails. This part is
  // not an HTTP failure, so nothing else would ever see it — a browser that refuses the
  // Blob URL leaves the user with a silent no-op download.
  try {
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'file_download' } });
    throw err;
  }
}
