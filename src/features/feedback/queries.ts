import { useMutation } from '@tanstack/react-query';
import { submitFeedback, type FeedbackSubmission } from './api/feedback';

/**
 * No `invalidateQueries`: a support message is write-only from the app's side.
 * Replies arrive by email, so there is nothing cached here to refresh.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: FeedbackSubmission) => submitFeedback(data),
  });
}
