/**
 * The day of the month rent is assumed due when a renter has no `payment_day_of_month`.
 *
 * This mirrors the backend: the overdue engine treats a missing payment day as the 1st when
 * deciding whether rent is late. That fallback is deliberate — an owner who never set a day
 * should still be chased — but it used to be invisible, because the form left the field blank
 * and the detail view hid the row entirely. So rent was chased on a date the owner had never
 * been shown.
 *
 * Keep this in step with the backend fallback, and with the mobile app's copy of the same
 * constant (`rent-control/src/shared/constants/paymentDay.ts`).
 */
export const DEFAULT_PAYMENT_DAY_NUM = 1;

/** String form, for pre-filling the renter form's text input. */
export const DEFAULT_PAYMENT_DAY = String(DEFAULT_PAYMENT_DAY_NUM);
