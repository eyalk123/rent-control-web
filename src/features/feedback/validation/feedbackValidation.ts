import { z } from 'zod';

export const FEEDBACK_TYPES = ['bug', 'question', 'suggestion'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Matches the API's own cap, so an over-long message is caught before the round-trip. */
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_SCREENSHOTS = 3;

export const feedbackFormSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  // Messages are error-keyed rather than error-worded: FormInput renders
  // `t(error, { defaultValue: error })`, so a literal string would ship untranslated.
  message: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'common.required' })
    .refine((v) => v.length <= MAX_MESSAGE_LENGTH, { message: 'feedback.messageTooLong' }),
});

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;
