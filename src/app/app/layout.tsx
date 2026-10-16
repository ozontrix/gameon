import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { BookingsProvider } from '@/components/mobile/bookings-store';
import { HomeContentProvider } from '@/components/mobile/home-content-provider';
import { NotificationsProvider } from '@/components/mobile/notifications-provider';
import { SessionProvider } from '@/components/mobile/session-provider';
import { SportsCatalogProvider } from '@/components/mobile/sports-catalog-provider';
import { SHEET_ROOT_ID } from '@/components/mobile/ui';
import './mobile.css';

/**
 * The shell for every `/app` screen.
 *
 * Three jobs: keep the route out of search results, hold the handset frame the
 * screens render inside, and mount the shared providers once for the whole
 * subtree.
 *
 * The providers are nested rather than flattened because three of them depend on
 * the one above: notifications, bookings and the profile read all need to know
 * who is signed in, and the catalog is public but is read by screens the others
 * also read. This is the same nesting the Expo app uses in its root layout.
 *
 * The frame is a real element rather than a CSS trick on `body`, so the
 * marketing site's own layout is untouched. `#gameon-sheet-root` is the element
 * bottom sheets portal into, so a sheet belongs to the phone column instead of
 * the browser window.
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
        <SessionProvider>
          <NotificationsProvider>
            <BookingsProvider>
              <HomeContentProvider>
                <SportsCatalogProvider>{children}</SportsCatalogProvider>
              </HomeContentProvider>
            </BookingsProvider>
          </NotificationsProvider>
        </SessionProvider>
        <div id={SHEET_ROOT_ID} />
      </div>
    </div>
  );
}

