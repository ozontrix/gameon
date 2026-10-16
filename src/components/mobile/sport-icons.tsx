import type { ReactNode } from 'react';

import { Mdi, type IconProps, type IonName, type MdiName } from '@/components/mobile/ui/icons';
import { Brand } from '@/lib/mobile/theme';
import type { SportKind } from '@/lib/mobile/constants/sports';

/**
 * The glyph for each sport, from MaterialCommunityIcons so all four share one
 * drawing style and optical weight — the same mapping as the app's
 * `constants/icons.ts`. There is no pickleball glyph, so its paddle uses the
 * table-tennis one.
 */
export const SPORT_ICONS: Record<SportKind, MdiName> = {
  badminton: 'badminton',
  pickleball: 'tableTennis',
  cricket: 'cricket',
  football: 'soccer',
};

/**
 * A tab's icon in both weights. Outline when idle, filled when focused — the
 * platform convention on both iOS and Android, and the cheapest way to make a
 * tab bar feel finished.
 *
 * `sports` is a ball rather than a shuttlecock because a ball reads clearly at
 * 22px, and it stands for the facility rather than a single sport. `events` is
 * a trophy, not a second calendar — this tab is "Events & Tournaments", and two
 * adjacent calendar glyphs were indistinguishable at a glance.
 */
export type TabIcon = { idle: IonName; active: IonName };

export const TAB_ICONS = {
  home: { idle: 'homeOutline', active: 'home' },
  sports: { idle: 'tennisballOutline', active: 'tennisball' },
  bookings: { idle: 'calendarOutline', active: 'calendar' },
  events: { idle: 'trophyOutline', active: 'trophy' },
  accounts: { idle: 'personOutline', active: 'person' },
} as const satisfies Record<string, TabIcon>;

/** Renders the icon for a sport, so callers never map kind to glyph. */
export function SportGlyph({
  sport,
  size = 24,
  color = Brand.accent,
}: IconProps & { sport: SportKind }): ReactNode {
  return <Mdi name={SPORT_ICONS[sport]} size={size} color={color} />;
}
