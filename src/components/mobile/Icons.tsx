import type { ReactNode, SVGProps } from 'react';

/**
 * The app's glyph set, as inline SVG.
 *
 * The Expo app draws these with `@expo/vector-icons` (Ionicons); a web app has
 * no icon font to load, so the same outline-and-filled pairs are written out
 * here. `active` variants are the filled forms a focused tab or a completed
 * step shows, mirroring the Ionicons `x` / `x-outline` pairing the mockups use.
 *
 * Every icon inherits `currentColor` unless a colour is passed, so a parent's
 * text colour is enough to theme it.
 */

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function Svg({
  size = 22,
  color = 'currentColor',
  strokeWidth = 2,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}>
      {children}
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.6 3h-2A1.6 1.6 0 0 0 3 4.7C3 12.6 11.4 21 19.3 21a1.6 1.6 0 0 0 1.7-1.6v-2a1 1 0 0 0-.8-1l-3.3-.6a1 1 0 0 0-1 .4l-1 1.3a13 13 0 0 1-5.4-5.4l1.3-1a1 1 0 0 0 .4-1L10.6 4z" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </Svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.6 7 9.8 4.1-2.2 7-5.5 7-9.8V5.8z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Svg>
  );
}

/** The bolt inside the GameOn wordmark. */
export function PowerIcon({ strokeWidth = 3.2, ...props }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...props}>
      <path d="M12 2.5v8.5" />
      <path d="M6.6 6.6a7.5 7.5 0 1 0 10.8 0" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.4v.1" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 4.5h3A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5h-3" />
      <path d="M11 8 7 12l4 4M7 12h9" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 4 4" />
    </Svg>
  );
}

/* ── Bottom-tab glyphs ──────────────────────────────────────────────────────
 * Each pairs an outline with a filled form, the way Ionicons does, so the
 * active tab is the same shape in the accent colour rather than a new icon.
 */

type TabIconProps = IconProps & { active?: boolean };

/** Solid-path helper: a filled icon draws its outline in the fill colour too. */
function solidProps({ active, color, ...rest }: TabIconProps) {
  return { color, fill: active ? color : 'none', strokeWidth: active ? 1.4 : 2, ...rest };
}

export function HomeIcon(props: TabIconProps) {
  return (
    <Svg {...solidProps(props)}>
      <path d="M3.5 10.6 12 3.8l8.5 6.8V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function SportsIcon(props: TabIconProps) {
  return (
    <Svg {...solidProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.2 3.6 2.6-1.4 4.2h-4.4L8.4 9.8z" strokeWidth={1.6} />
      <path d="M12 3v4.2M20.5 9.4l-4.9.4M18 19.6l-3.8-5.6M6 19.6l3.8-5.6M3.5 9.4l4.9.4" strokeWidth={1.2} />
    </Svg>
  );
}

export function BookingsIcon(props: TabIconProps) {
  return (
    <Svg {...solidProps(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3.5V7M16 3.5V7" strokeWidth={1.8} />
      <path d="m9 14.3 2 2 3.8-3.8" strokeWidth={1.6} />
    </Svg>
  );
}

export function EventsIcon(props: TabIconProps) {
  return (
    <Svg {...solidProps(props)}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 14.5v-1a2.5 2.5 0 0 0 0-5z" />
      <path d="M14 5v12" strokeWidth={1.6} />
    </Svg>
  );
}

export function AccountsIcon(props: TabIconProps) {
  return (
    <Svg {...solidProps(props)}>
      <circle cx="12" cy="8.6" r="3.7" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0z" />
    </Svg>
  );
}

/** The round sport badge on a card — the sport's own colour fills the disc. */
export function SportDiscIcon({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg size={size} color={color} strokeWidth={1.6}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 8 3 2.2-1.1 3.6h-3.8L9 10.2z" />
    </Svg>
  );
}

