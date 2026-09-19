import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockFeedbackApi } from '@/core/api/mock';
import type { EncodedImage } from '@/shared/utils/imageToBase64';
import type { FeedbackType } from '../validation/feedbackValidation';

export type FeedbackSubmission = {
  type: FeedbackType;
  message: string;
  screenshots: EncodedImage[];
};

export type FeedbackReceipt = {
  id: number;
  type: FeedbackType;
  created_at: string;
};

/**
 * Send a support message. The client app, platform and version already ride on
 * every request as `X-Client-*` headers, so the body carries only what the
 * transport can't tell the server.
 */
export async function submitFeedback(data: FeedbackSubmission): Promise<FeedbackReceipt> {
  if (USE_MOCK_API) {
    return mockFeedbackApi.submitFeedback(data);
  }

  const payload = {
    type: data.type,
    message: data.message,
    screenshots: data.screenshots.map((shot) => ({
      filename: shot.filename,
      content_type: shot.contentType,
      data: shot.data,
    })),
  };

  const response = await apiClient.post<FeedbackReceipt>('/support-messages', payload);
  return response.data;
}
