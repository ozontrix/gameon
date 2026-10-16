'use client';

/**
 * Email sign-in — `/app/email-login`. The form itself is shared with
 * `/app/email-signup` (`components/mobile/auth/email-screen.tsx`); this route is
 * the address the handset app calls `/email-login`, and the one "Continue with
 * Email" points at.
 */

import { EmailScreen } from '@/components/mobile/auth/email-screen';

export default function EmailLoginPage() {
  return <EmailScreen initialMode="signin" />;
}
