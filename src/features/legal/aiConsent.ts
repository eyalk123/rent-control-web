/**
 * Consent to send data to Anthropic, the AI provider behind lease and receipt scanning and
 * Ask RentVance.
 *
 * The mobile app asks this for App Store Guideline 5.1.2(i); web asks the same question so
 * the promise "nothing is sent unless you allow it" holds on every client. Asked the first
 * time a user scans a lease or a receipt, or sends the assistant a message — not at sign-up —
 * and recorded on the account (legal_acceptances, document `ai_processing`), so an answer
 * given on mobile counts here and vice versa.
 *
 * The wording lives in i18n under `aiConsent.*`. Changing what it says about the data sent,
 * the provider or the retention means bumping this version — in step with the mobile app's
 * copy, since the record is shared — which asks everyone again.
 */
// 2026-10-04: receipts added to what is sent, so everyone is asked again.
export const AI_CONSENT_VERSION = '2026-10-04';
