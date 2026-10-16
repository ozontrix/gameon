'use client';

/**
 * The shared hero for the Event and Tournament detail screens — the web twin of
 * the handset app's `components/events/detail-hero.tsx`: a full-bleed photo with
 * the status and countdown flags overlaid, the sport badge straddling its lower
 * edge, then title, category and meta lines.
 */

import { SportGlyph } from '@/components/mobile/sport-icons';
import { Badge, Ion, RemoteImage, type IonName } from '@/components/mobile/ui';
import {
  activityStatus,
  countdownLabel,
  type PublicActivity,
} from '@/lib/mobile/constants/events';
import { SPORT_PHOTOS, SPORT_TILES, type SportKind } from '@/lib/mobile/constants/sports';
import { Brand, Layout, Radius, Spacing, SportColors, Typography } from '@/lib/mobile/theme';

/** One line of the meta row under the title: glyph plus text. */
export type DetailMeta = { icon: IonName; text: string };

/** The photo a hero falls back to when the activity has none of its own. */
function heroImage(activity: PublicActivity): string {
  if (activity.images[0]) return activity.images[0];
  if (activity.sport) return SPORT_PHOTOS[activity.sport] ?? SPORT_TILES[activity.sport];
  return SPORT_TILES.badminton;
}

export function DetailHero({
  activity,
  meta,
  /** A second flag beside the status, e.g. the TOURNAMENT marker. */
  extraBadge,
}: {
  activity: PublicActivity;
  meta: DetailMeta[];
  extraBadge?: { label: string; icon: IonName };
}) {
  const status = activityStatus(activity);
  const countdown = countdownLabel(activity);
  const image = heroImage(activity);
  const sportColor = activity.sport ? SportColors[activity.sport as SportKind] : Brand.accent;

  return (
    <div>
      <div
        style={{
          position: 'relative',
          height: 208,
          backgroundColor: Brand.backgroundElement,
        }}>
        <RemoteImage
          uri={image}
          accessibilityLabel={activity.title}
          style={{ width: '100%', height: '100%' }}
        />
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, backgroundColor: Brand.overlay }}
        />

        <div
          style={{
            position: 'absolute',
            top: Spacing.md,
            left: Layout.gutter,
            right: Layout.gutter,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: Spacing.sm,
          }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
            <Badge
              label={status}
              tone={status === 'ongoing' ? 'success' : 'accent'}
              upper
            />
            {extraBadge ? (
              <Badge
                label={extraBadge.label}
                tone="accent"
                icon={<Ion name={extraBadge.icon} size={11} color={Brand.ink} />}
                upper
              />
            ) : null}
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: Spacing.xs,
              borderRadius: Radius.xs,
              paddingLeft: Spacing.sm,
              paddingRight: Spacing.sm,
              paddingTop: Spacing.xs,
              paddingBottom: Spacing.xs,
              backgroundColor: Brand.scrim,
            }}>
            <Ion name="calendarOutline" size={11} color={Brand.accent} />
            <span style={{ ...Typography.micro, color: Brand.text }}>{countdown.long}</span>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.xs,
          paddingLeft: Layout.gutter,
          paddingRight: Layout.gutter,
          paddingTop: Spacing.md,
        }}>
        {activity.sport ? (
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: Radius.pill,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -Spacing.xl,
              marginBottom: Spacing.sm,
              border: `2px solid ${Brand.background}`,
              backgroundColor: sportColor,
            }}>
            <SportGlyph sport={activity.sport} size={17} color={Brand.onAccent} />
          </span>
        ) : null}

        <span style={{ ...Typography.screenTitle, color: Brand.text }}>{activity.title}</span>
        <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
          {activity.category}
        </span>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingTop: Spacing.xs,
          }}>
          {meta.map((item, index) => (
            <span
              key={item.text}
              style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xs }}>
              {index > 0 ? (
                <span
                  style={{
                    ...Typography.caption,
                    color: Brand.textMuted,
                    paddingRight: Spacing.xs,
                  }}>
                  |
                </span>
              ) : null}
              <Ion name={item.icon} size={12} color={Brand.accent} />
              <span style={{ ...Typography.caption, color: Brand.textSecondary }}>{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
