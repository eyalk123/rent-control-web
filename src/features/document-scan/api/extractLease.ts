import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockDocumentScanApi } from '@/core/api/mock';
import type { LeaseExtraction } from '../types';

interface ExtractLeaseResponse {
  log_id: number;
  extraction: LeaseExtraction;
}

/** Upload a lease (PDF / DOCX / image) and get a structured property + renter draft plus
 *  the audit-log id to reference on submit. The backend processes the file in-memory and
 *  discards it; nothing is stored. */
export async function extractLease(
  file: File,
  signal?: AbortSignal,
): Promise<{ logId: number; extraction: LeaseExtraction }> {
  if (USE_MOCK_API) return mockDocumentScanApi.extractLease(file, signal);
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ExtractLeaseResponse>('/extract/lease', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Vision extraction on a multi-page lease can take a while — override the 10s default.
    timeout: 120000,
    // Lets the scan session abort the request (e.g. the user cancels the floating pill) so
    // we stop waiting on — and stop paying tokens for — an extraction they no longer want.
    signal,
  });
  return { logId: data.log_id, extraction: data.extraction };
}
