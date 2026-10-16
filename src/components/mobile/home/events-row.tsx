'use client';

/**
 * The Tournaments & Events card on Home — the web twin of the app
 * `components/home/events-row.tsx`. A single row that pushes into the Events
 * tab, because the rail itself is the tab.
 */

import Link from 'next/link';

import { Brand, Radius, Spacing } from '@/lib/mobile/theme';
import { Ion } from '../ui';

export function EventsRow() {
  return (
    <Link
      href="/app/events"
      aria-label="View our upcoming events and tournaments"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.three,
        backgroundColor: Brand.card,
        border: `1px solid ${Brand.cardBorder}`,
        borderRadius: 16,
        padding: Spacing.three,
        textDecoration: 'none',
      }}>
      <span
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.accentSoft,
        }}>
        <Ion name="trophy" size={28} color={Brand.accent} />
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: Brand.text, fontSize: 15, fontWeight: 800 }}>
          Tournaments &amp; Events
        </span>
        <span style={{ color: Brand.textSecondary, fontSize: 12.5 }}>
          Join our competitive leagues and open plays.
        </span>
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          backgroundColor: Brand.accent,
          borderRadius: 9,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 8,
          paddingBottom: 8,
          flexShrink: 0,
        }}>
        <span style={{ color: Brand.onAccent, fontSize: 12.5, fontWeight: 700 }}>Explore</span>
        <Ion name="chevronForward" size={13} color={Brand.onAccent} />
      </span>
    </Link>
  );
}
