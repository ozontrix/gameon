'use client';

/**
 * One notification row — the web twin of the app
 * `components/notifications/notification-card.tsx`.
 *
 * The unread state is an orange dot in place of the chevron, so the list reads
 * at a glance without a colour band per row, and a booking confirmation carries
 * a small tick on its tile because that is the one kind that is always good news.
 */

import { Brand, Radius, Spacing } from '@/lib/mobile/theme';
import type { NotificationItem, NotificationKind } from '@/lib/mobile/constants/notifications';
import { Ion, PressableScale, type IonName } from '../ui';

/** Per-kind circular tile colour and glyph. */
const KIND_META: Record<NotificationKind, { icon: IonName; color: string }> = {
  booking: { icon: 'calendar', color: Brand.success },
  reminder: { icon: 'notifications', color: Brand.accentAlt },
  tournament: { icon: 'trophy', color: Brand.info },
  wallet: { icon: 'walletOutline', color: Brand.accent },
  facility: { icon: 'alertCircleOutline', color: Brand.info },
  offer: { icon: 'pricetagOutline', color: Brand.accentAlt },
  general: { icon: 'alertCircleOutline', color: Brand.warning },
};

export function NotificationRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const meta = KIND_META[item.kind];

  return (
    <PressableScale
      onPress={onPress}
      label={`${item.title}. ${item.message}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: Spacing.three,
        width: '100%',
        padding: Spacing.three,
        border: 'none',
        background: 'none',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}>
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: meta.color,
        }}>
        <Ion name={meta.icon} size={20} color={Brand.onAccent} />
        {item.kind === 'booking' ? (
          <span
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 14,
              height: 14,
              borderRadius: Radius.pill,
              backgroundColor: Brand.success,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ion name="checkmark" size={10} color={Brand.onAccent} />
          </span>
        ) : null}
      </span>

      <span
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: Spacing.one }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              color: Brand.text,
              fontSize: 14.5,
              fontWeight: 800,
              letterSpacing: 0.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
            {item.title}
          </span>
          {item.badge ? (
            <span
              style={{
                backgroundColor: Brand.successSoft,
                borderRadius: 5,
                paddingLeft: 6,
                paddingRight: 6,
                paddingTop: 2,
                paddingBottom: 2,
                color: Brand.success,
                fontSize: 10,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}>
              {item.badge}
            </span>
          ) : null}
          <span style={{ flex: 1 }} />
          <span
            style={{ color: Brand.textMuted, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {item.time}
          </span>
          {item.unread ? (
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: Brand.accent,
                marginLeft: 2,
                flexShrink: 0,
              }}
            />
          ) : (
            <Ion name="chevronForward" size={16} color={Brand.textMuted} />
          )}
        </span>

        <span style={{ color: Brand.textSecondary, fontSize: 13, lineHeight: '19px' }}>
          {item.message}
        </span>
      </span>
    </PressableScale>
  );
}
