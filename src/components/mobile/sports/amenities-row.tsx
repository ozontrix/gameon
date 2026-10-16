'use client';

/**
 * The single-row amenity strip from the mockup — the web twin of the app
 * `components/sports/amenities-row.tsx`.
 *
 * Six tiles is wider than a phone at a legible size, so the row scrolls
 * horizontally rather than shrinking the labels past readability.
 */

import type { Amenity } from '@/lib/mobile/constants/sports';
import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, Mdi, ReservedText, ionFromFontName, mdiFromFontName } from '../ui';

/** Two lines, reserved, so a one-word amenity tile matches a two-word one. */
const LABEL_LINE = 14;
const LABEL_LINES = 2;

/**
 * The glyph for an amenity. The icon arrives as an icon-font name
 * (`layers-outline`), so it is resolved against the registry first; a name this
 * build does not draw falls back to a neutral glyph rather than to nothing, and
 * the label still says what the amenity is.
 */
function AmenityGlyph({ icon }: { icon: Amenity['icon'] }) {
  if (icon.family === 'mci') {
    return <Mdi name={mdiFromFontName(icon.name) ?? 'textureBox'} size={20} color={Brand.accent} />;
  }
  return <Ion name={ionFromFontName(icon.name) ?? 'informationCircleOutline'} size={20} color={Brand.accent} />;
}

export function AmenitiesRow({ amenities }: { amenities: Amenity[] }) {
  return (
    <div
      className="mobile-scroll"
      style={{
        display: 'flex',
        gap: Spacing.sm,
        overflowX: 'auto',
        paddingRight: Layout.gutter,
      }}>
      {amenities.map((amenity) => (
        <div
          key={amenity.label}
          style={{
            width: 76,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Spacing.sm,
            borderRadius: Radius.md,
            border: `1px solid ${Brand.cardBorder}`,
            backgroundColor: Brand.backgroundElement,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.md,
            paddingLeft: Spacing.sm,
            paddingRight: Spacing.sm,
          }}>
          <AmenityGlyph icon={amenity.icon} />
          <ReservedText
            lines={LABEL_LINES}
            lineHeight={LABEL_LINE}
            style={{ ...Typography.caption, color: Brand.textSecondary, textAlign: 'center' }}>
            {amenity.label}
          </ReservedText>
        </div>
      ))}
    </div>
  );
}
