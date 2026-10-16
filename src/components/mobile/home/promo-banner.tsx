'use client';

/**
 * The offer card under the quick actions, written in the admin panel — the web
 * twin of the app `components/home/promo-banner.tsx`.
 *
 * Nothing is shown unless an admin has published a promo banner: an offer the
 * venue is not actually running is worse than no card at all. There is
 * deliberately no placeholder offer — an earlier version fell back to a
 * hardcoded "Use code GAMEON10 at checkout", which advertised a discount that
 * does not exist and cannot be redeemed anywhere in the app.
 */

import Link from 'next/link';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useHomeContent } from '../home-content-provider';
import { Badge, RemoteImage } from '../ui';

export function PromoBanner() {
  const { content } = useHomeContent();
  const promo = content.banners.promo[0];

  if (!promo) return null;

  const label = [promo.titleAccent, promo.title, promo.subtitle, promo.badge]
    .filter(Boolean)
    .join('. ');

  const card = (
    <div
      style={{
        position: 'relative',
        // Clips the watermark to the card's rounded corner.
        overflow: 'hidden',
        borderRadius: Radius.md,
        border: `1px solid ${Brand.accentLight}`,
        backgroundColor: Brand.backgroundElement,
      }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          background: `radial-gradient(120px 120px at 92% 118%, ${Brand.accentGlow} 0%, transparent 70%)`,
        }}
      />

      <div style={{ position: 'relative', padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
          {promo.titleAccent ? (
            <span style={{ ...Typography.micro, color: Brand.accent, textTransform: 'uppercase' }}>
              {promo.titleAccent}
            </span>
          ) : (
            <span />
          )}
          {promo.badge ? <Badge label={promo.badge} tone="accent" /> : null}
        </div>

        <span style={{ ...Typography.sectionTitle, color: Brand.text, maxWidth: '75%' }}>
          {promo.title}
        </span>
        {promo.subtitle ? (
          <span style={{ ...Typography.caption, color: Brand.textSecondary, maxWidth: '75%' }}>
            {promo.subtitle}
          </span>
        ) : null}
      </div>

      {promo.imageUrl ? (
        <RemoteImage
          uri={promo.imageUrl}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', opacity: 0.45 }}
        />
      ) : null}
    </div>
  );

  if (!promo.link) return card;

  return (
    <Link href={promo.link} aria-label={label} style={{ display: 'block', textDecoration: 'none' }}>
      {card}
    </Link>
  );
}
