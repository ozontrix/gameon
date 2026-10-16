'use client';

/**
 * The tab shell.
 *
 * In the Expo app this is the `(tabs)` group plus `app-tabs.tsx`. Here it is a
 * route group with a layout, which means the tab bar is mounted once and the
 * five screens swap underneath it — the same thing a native tab navigator does.
 *
 * The gate is what keeps a deep link honest: browsing needs a verified identity
 * or the guest mode the login screen sets, so `/app/home` on a fresh browser
 * lands on the login screen instead of an empty dashboard.
 */

import type { ReactNode } from 'react';

import { AuthWait } from '@/components/mobile/AuthWait';
import { BottomTabs } from '@/components/mobile/BottomTabs';
import { useAccountGate } from '@/components/mobile/use-auth-guard';

export default function TabsLayout({ children }: { children: ReactNode }) {
  const { waiting } = useAccountGate();

  if (waiting) return <AuthWait />;

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
      {children}
      <BottomTabs />
    </div>
  );
}
