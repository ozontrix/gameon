'use client';

/**
 * The time-slot grid: three across, so a label like "10:00 AM" has room.
 * Unavailable slots read as "Booked" and are inert; the chosen one fills with the
 * accent rather than merely outlining, which is legible at a glance.
 *
 * `slots` is required on purpose. In the handset app it used to default to the
 * app's hour labels, which meant a caller that forgot to pass server slots
 * silently rendered a made-up grid with invented "Booked" cells.
 */

import type { TimeSlot } from '@/lib/mobile/constants/slots';
import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { PressableScale } from '../ui';

export function SlotGrid({
  value,
  onChange,
  slots,
}: {
  value?: string;
  onChange: (key: string) => void;
  slots: TimeSlot[];
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
      {slots.map((slot) => {
        const selected = slot.key === value;
        const tint = selected ? Brand.onAccent : slot.available ? Brand.text : Brand.textMuted;

        return (
          <PressableScale
            key={slot.key}
            disabled={!slot.available}
            onPress={() => onChange(slot.key)}
            label={`${slot.start} to ${slot.end}${slot.available ? '' : ', unavailable'}`}
            style={{
              flexBasis: '30%',
              flexGrow: 1,
              minHeight: Layout.minHitTarget,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              borderRadius: Radius.md,
              border: `1px solid ${
                selected ? Brand.accent : slot.available ? Brand.cardBorder : Brand.divider
              }`,
              backgroundColor: selected
                ? Brand.accent
                : slot.available
                  ? Brand.backgroundElement
                  : Brand.background,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.sm,
              paddingLeft: Spacing.xs,
              paddingRight: Spacing.xs,
              opacity: slot.available ? 1 : 0.6,
              cursor: slot.available ? 'pointer' : 'default',
            }}>
            <span
              style={{
                ...Typography.label,
                color: tint,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
              {slot.start}
            </span>
            <span
              style={{
                ...Typography.caption,
                fontSize: 10,
                color: selected ? Brand.onAccent : Brand.textMuted,
                opacity: selected ? 0.85 : 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
              {slot.available ? `to ${slot.end}` : 'Booked'}
            </span>
          </PressableScale>
        );
      })}
    </div>
  );
}
