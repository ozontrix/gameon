'use client';

/**
 * The line box each row of text occupies, and how many of them every tile
 * reserves. The reserve is what keeps the row aligned: at four across, a tile is
 * ~86pt wide, so "Easy Booking" fits one line while "Trusted Venues" needs two.
 * Letting the copy decide the height left no two tiles the same and nothing
 * lining up, so each block is given a fixed number of lines instead and the copy
 * is written to fit them.
 */

import { Brand, Spacing } from '@/lib/mobile/theme';
import { Mdi, ReservedText, type MdiName } from '../ui';

const TITLE_LINE = 14;
const TITLE_LINES = 1;
const CAPTION_LINE = 13;
const CAPTION_LINES = 2;

const FEATURES: { icon: MdiName; title: string; sub: string }[] = [
  { icon: 'snowflake', title: 'Climate Control', sub: 'Premium AC indoor courts' },
  { icon: 'textureBox', title: 'Pro Flooring', sub: 'Synthetic & wooden surfaces' },
  { icon: 'grass', title: 'Open Air', sub: 'Premium outdoor courts' },
  { icon: 'cricket', title: 'Practice Nets', sub: 'Dedicated turf & boxes' },
];

export function FeaturesRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        justifyContent: 'space-between',
      }}>
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.xs }}>
          <Mdi name={feature.icon} size={21} color={Brand.accent} />

          <ReservedText
            lines={TITLE_LINES}
            lineHeight={TITLE_LINE}
            center
            style={{
              color: Brand.text,
              fontSize: 11,
              fontWeight: 700,
              textAlign: 'center',
            }}>
            {feature.title}
          </ReservedText>

          <ReservedText
            lines={CAPTION_LINES}
            lineHeight={CAPTION_LINE}
            style={{ color: Brand.textMuted, fontSize: 10, textAlign: 'center' }}>
            {feature.sub}
          </ReservedText>
        </div>
      ))}
    </div>
  );
}
