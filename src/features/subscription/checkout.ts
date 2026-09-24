/**
 * Where web checkout starts.
 *
 * Checkout runs inside RentVance through RevenueCat's Web SDK (purchases-js), with Paddle
 * as the payment provider underneath. That wiring waits on two things outside this repo: a
 * Paddle configuration in the RevenueCat project, and the Paddle catalog it imports prices
 * from. Until both exist there is nothing to sell, so the plan picker renders its buy button
 * disabled and says why, rather than offering a button that fails when pressed.
 *
 * When they exist, this flips to true and the picker calls purchases-js from here, configured
 * with the Firebase UID as the RevenueCat app user id. That id is what the webhook resolves to
 * an account, so a purchase made under anything else would belong to nobody.
 */
export const CHECKOUT_AVAILABLE = false;
