'use client';

/**
 * One route into the app on the sign-in screen. The web twin of the app
 * `components/auth/auth-card.tsx`.
 *
 * The three routes used to be identical cards, each with a solid accent tile,
 * separated by "OR" dividers — five elements of the same weight and nothing
 * telling you where to start. Now the recommended route carries the accent and
 * the others sit quietly beneath it, which is what lets the dividers go.
 */

import type { ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Badge, PressableScale } from '../ui';
import { ChevronRightIcon, MailIcon, PhoneIcon, UserIcon } from './icons';

export type AuthCardIcon = 'phone' | 'email' | 'user';

/**
 * `primary` marks the recommended route in. Everything else stays quiet, so
 * exactly one element on the screen is asking to be tapped.
 */
export type AuthCardEmphasis = 'primary' | 'default';

const TILE = 44;

function CardIcon({ kind, color }: { kind: AuthCardIcon; color: string }): ReactNode {
  switch (kind) {
    case 'phone':
      return <PhoneIcon size={22} color={color} />;
    case 'email':
      return <MailIcon size={22} color={color} />;
    case 'user':
      return <UserIcon size={22} color={color} />;
  }
}

export function AuthCard({
  icon,
  title,
  subtitle,
  emphasis = 'default',
  tag,
  onPress,
}: {
  icon: AuthCardIcon;
  title: string;
  subtitle: string;
  emphasis?: AuthCardEmphasis;
  /** Small tag shown on the primary card, e.g. "FASTEST". */
  tag?: string;
  onPress?: () => void;
}) {
  const primary = emphasis === 'primary';

  return (
    <PressableScale
      onPress={onPress}
      label={`${title}. ${subtitle}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
        borderRadius: Radius.lg,
        border: `1px solid ${primary ? Brand.accent : Brand.cardBorder}`,
        background: primary ? Brand.accentGlass : Brand.card,
        padding: Spacing.md,
        fontFamily: 'inherit',
        textAlign: 'left',
      }}>
      <span
        style={{
          width: TILE,
          height: TILE,
          flexShrink: 0,
          borderRadius: Radius.md,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          // The one solid accent block on the screen.
          background: primary ? Brand.accent : Brand.accentGlass,
        }}>
        <CardIcon kind={icon} color={primary ? Brand.onAccent : Brand.accent} />
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.xxs,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
          <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>
          {tag ? <Badge label={tag} tone="accent" /> : null}
        </span>
        <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>{subtitle}</span>
      </span>

      <ChevronRightIcon size={18} color={primary ? Brand.accent : Brand.textMuted} />
    </PressableScale>
  );
}
