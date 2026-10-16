'use client';

/**
 * The booking call to action on Home: pick a sport, land on the Sports tab
 * already filtered to it.
 *
 * The four bare glyphs this replaces said only "badminton" — not that courts
 * were bookable, how many there are, or what one costs. Each card now carries
 * that, which is what turns a shortcut into an invitation to book.
 */

import Link from 'next/link';

import { price } from '@/lib/mobile/constants/config';
import { SPORT_LABELS, SPORT_TILES, type SportKind } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useHomeContent, type HomeSport } from '../home-content-provider';
import { Ion, SectionHeader } from '../ui';

export function BookCourt() {
  const { content } = useHomeContent();

  const sports = content.sports.slice(0, 4);
  if (sports.length === 0) return null;

  // Most booked over the last 30 days, worth pointing at — but only when it is
  // genuinely ahead, not when everything is level (or at zero).
  const busiest = [...content.sports].sort((a, b) => b.bookingsLast30Days - a.bookingsLast30Days)[0];
  const popularId =
    busiest &&
    busiest.bookingsLast30Days > 0 &&
    busiest.bookingsLast30Days > (content.sports[1]?.bookingsLast30Days ?? 0)
      ? busiest.id
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
      <SectionHeader
        title="Book a court"
        icon="tennisballOutline"
        // Every sport already has a card unless there are more than four, so the
        // link would just repeat what is on screen.
        trailing={content.sports.length > sports.length ? <AllSportsLink /> : undefined}
      />
      <span style={{ ...Typography.caption, color: Brand.textSecondary, marginTop: -Spacing.xxs }}>
        Pick a sport to see the courts you can book.
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
        {sports.map((sport) => (
          <SportCard key={sport.id} sport={sport} popular={sport.id === popularId} />
        ))}
      </div>
    </div>
  );
}

/** The "All sports" escape hatch, only shown when a sport is off the grid. */
function AllSportsLink() {
  return (
    <Link
      href="/app/sports"
      className="mobile-link"
      style={{ ...Typography.bodyStrong, color: Brand.accent, whiteSpace: 'nowrap' }}>
      All sports
    </Link>
  );
}

function SportCard({ sport, popular }: { sport: HomeSport; popular: boolean }) {
  const label = sport.key ? SPORT_LABELS[sport.key as SportKind] : sport.name;
  const tile = sport.key ? SPORT_TILES[sport.key as SportKind] : undefined;
  const courts = `${sport.courtCount} ${sport.courtCount === 1 ? 'court' : 'courts'}`;

  return (
    <Link
      href={sport.key ? `/app/sports?sport=${sport.key}` : '/app/sports'}
      aria-label={`Book ${label}. ${courts}, from ${price(sport.priceFrom)}.`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.xxs,
        flexBasis: '47%',
        flexGrow: 1,
        borderRadius: Radius.lg,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.card,
        padding: Spacing.md,
        textDecoration: 'none',
      }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: Radius.md,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Brand.accentSoft,
          }}>
          {tile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tile} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          ) : (
            <Ion name="tennisballOutline" size={22} color={Brand.accent} />
          )}
        </span>
        {popular ? (
          <span
            style={{
              borderRadius: Radius.xs,
              paddingLeft: Spacing.xs,
              paddingRight: Spacing.xs,
              paddingTop: 2,
              paddingBottom: 2,
              backgroundColor: Brand.accentSoft,
              ...Typography.caption,
              fontSize: 9,
              fontWeight: 700,
              color: Brand.accent,
              textTransform: 'uppercase',
            }}>
            Popular
          </span>
        ) : null}
      </span>

      <span style={{ ...Typography.cardTitle, color: Brand.text, marginTop: Spacing.xs }}>
        {label}
      </span>
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>{courts}</span>

      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Spacing.xs,
          marginTop: Spacing.xs,
        }}>
        <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
          from{' '}
          <span style={{ ...Typography.label, color: Brand.accent }}>{price(sport.priceFrom)}</span>
        </span>
        <Ion name="arrowForward" size={14} color={Brand.accent} />
      </span>
    </Link>
  );
}
