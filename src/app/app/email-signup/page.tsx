'use client';

/**
 * Create an account — `/app/email-signup`. The address the handset app calls
 * `/email-signup`, and where the sign-in screen's "Create an account" and the
 * email screen's "New to GameOn?" both point.
 *
 * Same form as `/app/email-login` (see `components/mobile/auth/email-screen.tsx`),
 * with the full name and the referral code it adds — the code is applied when the
 * account is created, so it cannot be added later.
 */

import { EmailScreen } from '@/components/mobile/auth/email-screen';

export default function EmailSignupPage() {
  return <EmailScreen initialMode="signup" />;
}
