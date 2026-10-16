/**
 * Checkout constants — the web twin of the handset app's `constants/payment.ts`.
 *
 * Razorpay's own checkout owns every payment rail — card, UPI, net banking and
 * wallets — so there is deliberately no local list of methods, banks or UPI apps
 * here, and nothing describes a form the app renders itself.
 */

/**
 * GameOn Points redeem at par with rupees. The brief says Points can "fully or
 * partially pay for a slot booking" but never states a rate, so par is the
 * assumption.
 *
 * The server is the authority on how many Points a booking actually absorbs;
 * this pair is only for showing the player what their chosen amount is worth.
 */
export const POINTS_PER_RUPEE = 1;

/** Rupee value of a points amount. */
export function pointsToRupees(points: number): number {
  return Math.floor(points / POINTS_PER_RUPEE);
}

/** Points needed to cover a rupee amount. */
export function rupeesToPoints(rupees: number): number {
  return Math.ceil(rupees * POINTS_PER_RUPEE);
}

/**
 * Network marks along the foot of the payment screen. Text pills, not logos, and
 * no PCI DSS badge: certification sits with the gateway (Razorpay), not with
 * GameOn, so claiming it here would be untrue.
 */
export const PAYMENT_TRUST_MARKS = ['RuPay', 'VISA', 'MC'] as const;

export const PAYMENT_GATEWAY_NAME = 'Razorpay';

/** The colour Razorpay's checkout is themed with, matching the handset app. */
export const RAZORPAY_THEME_COLOR = '#28a745';
