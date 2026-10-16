'use client';

/**
 * The GameOn wordmark.
 *
 * This is the official `public/game_on.png`, used exactly as it ships — the same
 * rule `components/league/landing.tsx` already follows: no rebuilt GAME ⚡ N text
 * lockup and no separate power glyph, because the mark's own gradients are part of
 * the brand and a retyped version never quite matches it.
 *
 * `size` is the rendered height; the width follows the mark's own 893×250 ratio, so
 * it stays in proportion at every size the header and the auth screens ask for.
 */

import Image from 'next/image';

export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/game_on.png"
      alt="GameOn"
      width={893}
      height={250}
      sizes="180px"
      priority
      style={{ height: size, width: 'auto' }}
    />
  );
}
