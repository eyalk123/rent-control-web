import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockDocumentScanApi } from '@/core/api/mock';
import type { ReceiptExtraction } from '../types';

interface ExtractReceiptResponse {
  log_id: number;
  extraction: ReceiptExtraction;
}

/** Upload a receipt (photo or PDF) and get an expense draft plus the audit-log id to
 *  reference on submit. `matchProperty` is false when the form already knows the property,
 *  so the backend does not send the owner's properties to the model at all. */
export async function extractReceipt(
  file: File,
  matchProperty: boolean,
): Promise<{ logId: number; extraction: ReceiptExtraction }> {
  if (USE_MOCK_API) return mockDocumentScanApi.extractReceipt(file, matchProperty);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('match_property', String(matchProperty));
  const { data } = await apiClient.post<ExtractReceiptResponse>('/extract/receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // A single image is quicker than a lease, but still a vision call — well past the 10s default.
    timeout: 60000,
  });
  return { logId: data.log_id, extraction: data.extraction };
}
