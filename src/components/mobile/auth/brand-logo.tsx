'use client';

/**
 * The GAME⚡N wordmark. The web twin of the app `components/auth/brand-logo.tsx`.
 *
 * Written as text rather than shipped as an image so it stays crisp at any size,
 * with the bolt drawn in the brand orange between the two halves.
 */

import { Brand, Fonts } from '@/lib/mobile/theme';
import { PowerIcon } from './icons';

export function BrandLogo({ size = 32 }: { size?: number }) {
  const gap = Math.round(size * 0.16);
  const power = Math.round(size * 0.94);
  const spacing = Math.round(size * 0.11);
  const word = {
    fontFamily: Fonts.display,
    fontSize: size,
    letterSpacing: `${spacing}px`,
    fontWeight: 800,
    color: Brand.text,
    lineHeight: 1,
  } as const;

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap, color: Brand.text }}
      role="img"
      aria-label="GameOn">
      <span style={word}>GAME</span>
      <PowerIcon size={power} color={Brand.accent} strokeWidth={3.2} />
      <span style={word}>N</span>
    </span>
  );
}
