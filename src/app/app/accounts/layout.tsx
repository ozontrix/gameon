'use client';

/**
 * The Account sub-screens' gate.
 *
 * On the handset these screens are a nested stack *inside* the Account tab, so the
 * tab's own gate covers them: a deep link with no session goes to the login screen
 * rather than to a screen that can only fail its reads. The web twin of that is this
 * layout — the same rule, applied to `/app/accounts/*`, with guest mode still allowed
 * through so the four public pages stay reachable.
 */

import type { ReactNode } from 'react';

import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { useAccountGate } from '@/components/mobile/use-auth-guard';

export default function AccountsLayout({ children }: { children: ReactNode }) {
  const { waiting } = useAccountGate();

  if (waiting) return <AuthWait />;

  return <>{children}</>;
}
