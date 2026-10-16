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

/**
 * `GET /user/referral` — the code, the current admin-set bonus amounts, and the
 * caller's own referral stats. Nothing here holds data: the endpoint is the source.
 *
 * How the programme works end to end: `handle_new_user` reads a `referral_code` out
 * of the sign-up metadata, matches it against `profiles.referral_code`, records
 * `referred_by` and pays the sign-up bonus. The code therefore has to be *entered at
 * sign-up*, which is why both sign-up screens collect one.
 */
export type ReferralSummary = {
  /** The caller's own code, minted by `generate_referral_code()`. */
  code: string;
  /** Points the *invited* player receives. Admin-set. */
  signupBonusPoints: number;
  /** Points the *referrer* receives once the invited player books. */
  firstBookingBonusPoints: number;
  totalReferred: number;
  totalPointsEarned: number;
};

/** What the invite says, built from the live bonus amounts. */
export function referralShareMessage(
  code: string,
  signupBonusPoints: number,
  firstBookingBonusPoints: number,
): string {
  const lines = [
    'Join me on GameOn Multisports!',
    '',
    signupBonusPoints > 0
      ? `Use my referral code ${code} when you create your account and you'll get ${signupBonusPoints} GameOn Points.`
      : `Use my referral code ${code} when you create your account.`,
    'Enter it on the Create Account screen.',
  ];

  if (firstBookingBonusPoints > 0) {
    lines.push(`I'll receive ${firstBookingBonusPoints} Points once you complete your first booking.`);
  }

  lines.push('', 'Book badminton, pickleball, cricket and football courts in one app.');
  return lines.join('\n');
}
