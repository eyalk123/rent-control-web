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

  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
