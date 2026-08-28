import { z } from 'zod';

// Messages are i18n keys, not sentences — the same convention the property and renter
// schemas use. Without them Zod emits its own English defaults ("Invalid email",
// "String must contain at least 6 character(s)"), which surfaced untranslated in the
// Hebrew UI on the first form a new user ever sees.
export const loginSchema = z.object({
  email: z.string().email({ message: 'validation.emailInvalid' }),
  password: z.string().min(6, { message: 'validation.passwordMinLength' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
