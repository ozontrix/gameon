'use client';

/**
 * The summary band above the booking CTA: what is being booked, what it costs,
 * and the breakdown behind that figure. The web twin of the app
 * `components/booking/booking-summary-bar.tsx`.
 *
 * The whole header is the toggle rather than a small link, and the panel expands
 * in place so the CTA below it glides rather than jumping.
 */

import { useState } from 'react';

import { price } from '@/lib/mobile/constants/config';
import { Duration } from '@/lib/mobile/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, PressableScale } from '../ui';

/** One line of the expandable price breakup. */
export type PriceLine = { label: string; amount: string };

export function BookingSummaryBar({
  dateTime,
  court,
  total,
  breakup,
}: {
  dateTime: string;
  court: string;
  total: number;
  breakup: PriceLine[];
}) {
  const [open, setOpen] = useState(false);

  // The last line is the payable figure; it repeats the headline total, so it is
  // set apart rather than read as one more charge.
  const lines = breakup.slice(0, -1);
  const payable = breakup[breakup.length - 1];

  return (
    <div
      style={{
        borderRadius: Radius.lg,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.card,
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        overflow: 'hidden',
      }}>
      <PressableScale
        onPress={() => setOpen((value) => !value)}
        label={`Booking summary, ${price(total)}. ${open ? 'Hide' : 'Show'} price breakdown.`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.md,
          width: '100%',
          border: 'none',
          background: 'none',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs, minWidth: 0 }}>
          <Fact icon="calendarOutline" value={dateTime} />
          <Fact icon="gridOutline" value={court} />
        </span>

        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span
            style={{
              ...Typography.caption,
              fontSize: 10,
              color: Brand.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}>
            Total
          </span>
          <span style={{ ...Typography.price, color: Brand.accent, whiteSpace: 'nowrap' }}>
            {price(total)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xxs }}>
            <span style={{ ...Typography.caption, fontSize: 11, color: Brand.textSecondary }}>
              Details
            </span>
            <span
              style={{
                display: 'inline-flex',
                transition: `transform ${Duration.fast}ms ease`,
                transform: open ? 'rotate(180deg)' : 'none',
              }}>
              <Ion name="chevronDown" size={12} color={Brand.textSecondary} />
            </span>
          </span>
        </span>
      </PressableScale>

      {open ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.xs,
            borderTop: `1px solid ${Brand.divider}`,
            marginTop: Spacing.sm,
            paddingTop: Spacing.sm,
          }}>
          {lines.map((line) => (
            <div
              key={line.label}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
              <span style={{ ...Typography.caption, color: Brand.textSecondary, flex: 1 }}>
                {line.label}
              </span>
              <span style={{ ...Typography.caption, color: Brand.text, fontWeight: 600 }}>
                {line.amount}
              </span>
            </div>
          ))}

          {payable ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: Spacing.md,
                borderTop: `1px solid ${Brand.divider}`,
                paddingTop: Spacing.xs,
                marginTop: Spacing.xxs,
              }}>
              <span style={{ ...Typography.label, color: Brand.text, flex: 1 }}>
                {payable.label}
              </span>
              <span style={{ ...Typography.label, color: Brand.accent }}>{payable.amount}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Fact({ icon, value }: { icon: 'calendarOutline' | 'gridOutline'; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.sm, minWidth: 0 }}>
      <span
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.accentSoft,
        }}>
        <Ion name={icon} size={12} color={Brand.accent} />
      </span>
      <span
        style={{
          ...Typography.caption,
          color: Brand.text,
          fontWeight: 600,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {value}
      </span>
    </span>
  );
}
