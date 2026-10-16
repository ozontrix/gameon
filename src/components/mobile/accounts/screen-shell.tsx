'use client';

/**
 * The shell for the Account sub-screens — the web twin of the handset app's
 * `components/accounts/screen-shell.tsx`: a back-chevron header over a scrolling
 * body.
 *
 * The handset keeps the tab bar visible on these screens because they are a nested
 * stack inside the Account tab. On the web they are ordinary pushed pages, so the
 * body simply clears the safe area; the back chevron returns to the previous
 * screen, or to the Account tab when there is nothing to go back to.
 */

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader, Screen, ScreenScroll } from '@/components/mobile/ui';

export function ScreenShell({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.push('/app/accounts'));

  return (
    <Screen>
      <AppHeader variant="back" onBack={goBack} />
      <ScreenScroll>{children}</ScreenScroll>
    </Screen>
  );
}
