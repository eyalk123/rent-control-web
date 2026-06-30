import apiClient from '@/core/api/client';
import type { LeaseExtraction } from '../types';

interface ExtractLeaseResponse {
  log_id: number;
  extraction: LeaseExtraction;
}

/** Upload a lease (PDF / DOCX / image) and get a structured property + renter draft plus
 *  the audit-log id to reference on submit. The backend processes the file in-memory and
 *  discards it; nothing is stored. */
export async function extractLease(file: File): Promise<{ logId: number; extraction: LeaseExtraction }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ExtractLeaseResponse>('/extract/lease', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Vision extraction on a multi-page lease can take a while — override the 10s default.
    timeout: 120000,
  });
  return { logId: data.log_id, extraction: data.extraction };
}
