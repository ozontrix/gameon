import type { CSSProperties } from 'react';

import { Brand } from '@/lib/mobile/theme';

/**
 * The hand-drawn brand and auth glyphs, ported path-for-path from the app's
 * `components/auth/icons.tsx` — a lightning bolt, and the rounded outline set
 * the sign-in cards use. These are stroke-drawn rather than filled Ionicons, so
 * they read as illustration at the sizes the auth screens use them.
 */

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

function Stroke({
  size = 24,
  color = Brand.text,
  strokeWidth = 2,
  style,
  children,
  viewBox = '0 0 24 24',
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

/** The bolt inside the GameOn wordmark. */
export function PowerIcon({ size = 24, color = Brand.accent, strokeWidth = 2.5, style }: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </Stroke>
  );
}

export function PhoneIcon({ size = 24, color = Brand.text, strokeWidth = 2, style }: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </Stroke>
  );
}

export function MailIcon({ size = 24, color = Brand.text, strokeWidth = 2, style }: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Stroke>
  );
}

export function UserIcon({ size = 24, color = Brand.text, strokeWidth = 2, style }: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Stroke>
  );
}

export function ShieldCheckIcon({ size = 24, color = Brand.accent, strokeWidth = 2, style }: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </Stroke>
  );
}

export function ChevronRightIcon({
  size = 24,
  color = Brand.accent,
  strokeWidth = 2.5,
  style,
}: IconProps) {
  return (
    <Stroke size={size} color={color} strokeWidth={strokeWidth} style={style}>
      <path d="m9 18 6-6-6-6" />
    </Stroke>
  );
}
