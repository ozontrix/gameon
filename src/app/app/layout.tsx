import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { SessionProvider } from '@/components/mobile/session-provider';
import './mobile.css';

/**
 * The shell for every `/app` screen.
 *
 * Two jobs: keep the route out of search results, and hold the handset frame the
 * screens render inside. The frame is a real element rather than a CSS trick on
 * `body`, so the marketing site's own layout is untouched by anything here.
 *
 * The session provider wraps the whole subtree — the tab bar included — because
 * the tab labels and the account rows change with who is signed in.
 */

export const metadata: Metadata = {
  title: 'GameOn App',
  description: 'Book badminton, pickleball, cricket and football courts, events and tournaments.',
  // An app shell has one meaningful entry point and no unique copy per screen.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0908',
  colorScheme: 'dark',
};

export default function MobileAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-viewport">
      <div className="mobile-frame">
        <SessionProvider>{children}</SessionProvider>
      </div>
    </div>
  );
}
