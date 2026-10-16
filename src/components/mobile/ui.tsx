'use client';

/**
 * The small pieces every screen is built from — screens compose these rather
 * than repeating colours and radii, so a token change reaches every surface.
 *
 * These are the web twins of the Expo app's `components/ui` exports. A
 * `PressableScale` on a handset animates a press with Reanimated; in a browser
 * the same effect is a CSS `:active` transform, which is what the `mobile-press`
 * class in `src/app/app/mobile.css` provides.
 */

import type { CSSProperties, ReactNode } from 'react';

import Link from 'next/link';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

/** A circular progress ring. Size is the diameter in pixels. */
export function Spinner({ size = 22, color = Brand.accent }: { size?: number; color?: string }) {
  return (
    <svg
      className="mobile-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" fill="none" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

type PressableScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Announced by a screen reader; falls back to the visible text. */
  label?: string;
  className?: string;
};

/**
 * A tappable surface that dips slightly when pressed. A real `<button>` so the
 * keyboard and a screen reader both reach it, restyled to sit flat.
 */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  type = 'button',
  label,
  className,
}: PressableScaleProps) {
  return (
    <button
      type={type}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className={`mobile-press${className ? ` ${className}` : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        border: 'none',
        background: 'none',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}>
      {children}
    </button>
  );
}

export type BadgeTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const BADGE_TONES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  accent: { background: Brand.accentSoft, color: Brand.accent, border: Brand.accentLight },
  neutral: { background: Brand.highlightWash, color: Brand.textSecondary, border: Brand.cardBorder },
  success: { background: Brand.successSoft, color: Brand.success, border: Brand.successSoft },
  warning: { background: Brand.warningSoft, color: Brand.warning, border: Brand.warningSoft },
  danger: { background: Brand.dangerSoft, color: Brand.danger, border: Brand.dangerSoft },
  info: { background: Brand.infoSoft, color: Brand.info, border: Brand.infoSoft },
};

/** A short, upper-case status chip. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = BADGE_TONES[tone];
  return (
    <span
      style={{
        ...Typography.micro,
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${Spacing.xxs}px ${Spacing.sm}px`,
        borderRadius: Radius.pill,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        whiteSpace: 'nowrap',
      }}>
      {label}
    </span>
  );
}

/** The surface a block of content sits on. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: Brand.card,
        border: `1px solid ${Brand.cardBorder}`,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        ...style,
      }}>
      {children}
    </div>
  );
}

/** A hairline between two rows or sections. */
export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: Brand.divider, width: '100%', ...style }} />;
}

/** A section title, with an optional action trailing it. */
export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
      }}>
      <h2 style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>{children}</h2>
      {action ? <TextLink label={action.label} size="sm" onPress={action.onPress} /> : null}
    </div>
  );
}

/**
 * A row that pushes somewhere.
 *
 * Two modes, because the two destinations are different elements: an `href`
 * renders an anchor (a navigable URL, shareable and middle-clickable), and an
 * `onPress` renders a button (an action). Wrapping one in the other would nest
 * a button inside an anchor, which is invalid HTML.
 */
export function ListRow({
  href,
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  /** Renders an anchor instead of a button. */
  href?: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.md,
        minHeight: 52,
        padding: `${Spacing.sm}px 0`,
        width: '100%',
      }}>
      {icon ? (
        <span
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: Radius.md,
            background: Brand.accentGlass,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>
        {subtitle ? (
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="mobile-press"
        style={{ display: 'flex', width: '100%', textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return (
    <PressableScale onPress={onPress} label={subtitle ? `${title}. ${subtitle}` : title}>
      {content}
    </PressableScale>
  );
}

/** What a screen shows when a read succeeded but returned nothing. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: Spacing.sm,
        padding: `${Spacing.xl}px ${Spacing.md}px`,
        border: `1px dashed ${Brand.cardBorder}`,
        borderRadius: Radius.lg,
        background: Brand.highlightWash,
      }}>
      {icon ? <span style={{ color: Brand.textMuted }}>{icon}</span> : null}
      <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>
      {body ? (
        <span style={{ ...Typography.bodySmall, color: Brand.textSecondary, maxWidth: 280 }}>
          {body}
        </span>
      ) : null}
      {action ? (
        <span style={{ marginTop: Spacing.sm }}>
          <TextLink label={action.label} onPress={action.onPress} />
        </span>
      ) : null}
    </div>
  );
}

/** The one line of reason a failed read or write shows. */
export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        ...Typography.bodySmall,
        display: 'flex',
        gap: Spacing.sm,
        alignItems: 'flex-start',
        padding: `${Spacing.sm}px ${Spacing.md}px`,
        borderRadius: Radius.md,
        border: `1px solid ${Brand.dangerSoft}`,
        background: Brand.dangerSoft,
        color: Brand.danger,
      }}>
      {message}
    </div>
  );
}

/** A text button — the quiet inline action next to a sentence. */
export function TextLink({
  label,
  onPress,
  size = 'md',
  color = Brand.accent,
}: {
  label: string;
  onPress?: () => void;
  size?: 'sm' | 'md';
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mobile-link"
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        color,
        fontSize: size === 'sm' ? 13 : 14,
        fontWeight: 600,
        fontFamily: 'inherit',
      }}>
      {label}
    </button>
  );
}
