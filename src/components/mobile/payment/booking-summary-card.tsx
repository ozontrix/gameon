'use client';

/**
 * The booking summary shared by the Payment and Booking Success screens: court
 * thumbnail, sport, title, the fact list, then the amount. The web twin of the app
 * `components/payment/booking-summary-card.tsx`.
 */

import { useState, type ReactNode } from 'react';

import { price } from '@/lib/mobile/constants/config';
import type { SportKind } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Card, DetailRow, Ion, RemoteImage, SportPill } from '../ui';

/** The facts listed under the title, in the mockup's order. */
export type SummaryFact = { label: string; value: string; icon: ReactNode };

export function BookingSummaryCard({
  title,
  sport,
  image,
  facts,
  /** Foot of the card: the amount and what to call it. */
  totalLabel,
  total,
  /** Adds the "View Details" toggle, collapsing the facts behind it. */
  collapsible = false,
  /** Right-hand content on the total row, e.g. a Payment ID chip. */
  totalTrailing,
}: {
  title: string;
  sport: SportKind;
  image?: string | null;
  facts: SummaryFact[];
  totalLabel: string;
  total: number;
  collapsible?: boolean;
  totalTrailing?: ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);

  return (
    <Card padded={false}>
      <div style={{ display: 'flex', gap: Spacing.md, padding: Spacing.md }}>
        {image ? (
          <RemoteImage
            uri={image}
            radius={Radius.md}
            accessibilityLabel={title}
            style={{ width: 76, height: 76, flexShrink: 0 }}
          />
        ) : null}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <SportPill sport={sport} size="sm" />
          <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>

          {open ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
              {facts.map((fact) => (
                <DetailRow key={fact.label} label={fact.label} value={fact.value} icon={fact.icon} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Spacing.md,
          borderTop: `1px solid ${Brand.divider}`,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.md,
        }}>
        <span style={{ ...Typography.label, color: Brand.textSecondary }}>{totalLabel}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.md }}>
          {totalTrailing}
          <span style={{ ...Typography.price, color: Brand.accent }}>{price(total)}</span>
        </span>
      </div>

      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mobile-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: Spacing.xs,
            width: '100%',
            border: 'none',
            borderTop: `1px solid ${Brand.divider}`,
            background: 'none',
            paddingLeft: Spacing.md,
            paddingRight: Spacing.md,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.sm,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
          <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
            {open ? 'Hide Details' : 'View Details'}
          </span>
          <Ion
            name={open ? 'chevronUp' : 'chevronDown'}
            size={12}
            color={Brand.textSecondary}
          />
        </button>
      ) : null}
    </Card>
  );
}
