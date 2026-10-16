'use client';

/**
 * The personalised welcome at the top of the Home dashboard, listed as the first
 * content item for Screen 2 in the brief. The web twin of the app
 * `components/home/greeting.tsx`.
 *
 * The name comes from the signed-in player's profile. A phone sign-in carries no
 * name until they fill in their profile, and a guest has none at all, so the
 * greeting simply drops the name rather than inventing one.
 */

import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';
import { useSession } from '../session-provider';

/** Greeting band by hour of day, so the welcome reads correctly at any time. */
function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting() {
  const { isGuest, user, profile } = useSession();
  const greeting = greetingFor(new Date().getHours());
  const fullName = isGuest ? '' : (profile?.full_name || user?.fullName || '').trim();
  const firstName = fullName.split(' ')[0];

  return (
    <div style={{ paddingLeft: Layout.gutter, paddingRight: Layout.gutter, paddingBottom: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
      <span
        style={{
          ...Typography.cardTitle,
          color: Brand.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {greeting}
        {firstName ? (
          <>
            , <span style={{ color: Brand.accent }}>{firstName}</span>
          </>
        ) : null}{' '}
        👋
      </span>
      <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
        {isGuest ? 'Sign in to book a court.' : 'Ready for your next game?'}
      </span>
    </div>
  );
}
