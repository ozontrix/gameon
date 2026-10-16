/**
 * App-level constants that appear in the UI. Kept out of the component tree so
 * the same city, contact address and currency symbol are never re-typed.
 *
 * The web twin of `gameon-multisports/src/constants/config.ts`.
 */

export const AppConfig = {
  /** Consistent venue location shown in the shared header on every tab. */
  location: 'Sector 70, Gurugram',
  /** Address the Event Detail screen composes a custom-booking mail to. */
  contactEmail: 'bookings@gameonmultisports.com',
  /** Currency symbol for every price in the app. */
  currency: '₹',
  /** Wallet points suffix, e.g. "2,450 PTS". */
  pointsUnit: 'PTS',
} as const;

/** Formats a rupee amount for display: `price(400)` → `"₹400"`. */
export function price(amount: number): string {
  return `${AppConfig.currency}${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Formats a points amount for display: `points(2450)` → `"2,450 PTS"`. */
export function points(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-IN')} ${AppConfig.pointsUnit}`;
}
