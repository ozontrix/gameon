'use client';

/**
 * The player's next slot, at the top of Home — the web twin of the app
 * `components/home/next-booking-card.tsx`.
 *
 * An ongoing booking wins over an upcoming one: if a slot is happening right
 * now, that is what the player wants to see, not the one after it. Tapping the
 * card opens the booking detail, where the check-in QR lives.
 */

import Link from 'next/link';

import { SPORT_TILES, type SportKind } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing } from '@/lib/mobile/theme';
import { useBookings } from '../bookings-store';
import { Ion } from '../ui';

export function NextBookingCard() {
  const { all } = useBookings();

  const ongoing = all.filter((booking) => booking.status === 'ongoing');
  const upcoming = all
    .filter((booking) => booking.status === 'upcoming')
    .sort((a, b) => a.hoursUntilSlot - b.hoursUntilSlot);
  const booking = ongoing[0] ?? upcoming[0];

  if (!booking) return null;

  const isOngoing = Boolean(ongoing[0]);
  const tint = isOngoing ? Brand.info : Brand.accent;
  const tile = SPORT_TILES[booking.sport as SportKind];

  return (
    <Link
      href={`/app/booking/${booking.key}`}
      aria-label={`Your next booking: ${booking.detailTitle}, ${booking.date}, ${booking.time}. Open to show the QR code.`}
      style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: Brand.card,
          border: `1px solid ${Brand.cardBorder}`,
          borderRadius: Radius.lg,
          overflow: 'hidden',
        }}>
        <div style={{ padding: Spacing.three }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.two }}>
            <span
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: Radius.pill,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: isOngoing ? Brand.infoSoft : Brand.accentLight,
              }}>
              {tile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tile} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              ) : (
                <Ion name="tennisball" size={20} color={Brand.accent} />
              )}
            </span>

            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  color: tint,
                  marginBottom: 2,
                }}>
                {isOngoing ? 'HAPPENING NOW' : 'YOUR NEXT GAME'}
              </span>
              <span
                style={{
                  color: Brand.text,
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: '20px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                {booking.detailTitle}
              </span>
            </span>

            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: Brand.textMuted, fontSize: 10, fontWeight: 600 }}>
                Booking ID
              </span>
              <span
                style={{
                  color: Brand.text,
                  fontSize: 13,
                  fontWeight: 800,
                  marginTop: 1,
                  whiteSpace: 'nowrap',
                }}>
                {booking.bookingId}
              </span>
            </span>
          </div>

          <div
            style={{
              marginTop: Spacing.three,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: Spacing.three,
              rowGap: Spacing.two,
            }}>
            {[
              { icon: 'calendarOutline' as const, text: booking.date },
              { icon: 'timeOutline' as const, text: booking.time },
              { icon: 'location' as const, text: booking.location },
            ].map((row) => (
              <span
                key={row.icon}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Ion name={row.icon} size={13} color={Brand.textMuted} />
                <span
                  style={{
                    color: Brand.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  {row.text}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ paddingLeft: Spacing.three, paddingRight: Spacing.three, paddingBottom: Spacing.three }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: `1px solid ${tint}`,
              borderRadius: 9,
              paddingTop: 10,
              paddingBottom: 10,
              backgroundColor: Brand.background,
            }}>
            <Ion name="qrCode" size={14} color={tint} />
            <span style={{ color: tint, fontSize: 13, fontWeight: 700 }}>Show QR at check-in</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
