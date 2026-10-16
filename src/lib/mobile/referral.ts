/**
 * The parts of email sign-up that the form and the mapper both need.
 *
 * `normaliseReferralCode` is copied verbatim from the Expo app's
 * `constants/referral.ts`: codes are minted as upper-case hex, so anything a
 * player types is normalised to match before it is sent as sign-up metadata.
 */

/** Codes are minted as upper-case hex, so anything typed is normalised to match. */
export function normaliseReferralCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

/** A code is usable only once it is long enough to be one the database minted. */
export function isUsableReferralCode(input: string): boolean {
  return normaliseReferralCode(input).length >= 6;
}
