/**
 * The single source of truth for every visual value in the mobile web app:
 * colour, type, spacing, radius, shadow and layout. Screens and components must
 * read from here — no raw hex, no magic font sizes, no ad-hoc border radii.
 *
 * This is the web twin of `gameon-multisports/src/constants/theme.ts`. The
 * values are identical on purpose: the `/app` route is meant to look like the
 * Expo app, so the numbers are copied rather than re-derived. Two conversions
 * are applied:
 *
 *   • `lineHeight` is written in `px`. React leaves `lineHeight` unitless, and a
 *     unitless CSS line height is a multiplier, not a length.
 *   • `Shadows` are CSS `box-shadow` strings, since there is no `shadow*` props
 *     set on the web.
 *
 * All 17 mockups in OZ-DOC-386 are dark, so `Brand` (= `Colors.dark`) is the
 * palette the app actually renders. `Colors.light` stays defined so a light
 * mode can be switched on later without re-deriving the semantics.
 */

import type { CSSProperties } from 'react';

/**
 * Canonical GameOn brand tokens — the raw values. Everything else in this file
 * is expressed in terms of these, and product code never imports `Palette`
 * directly; it reads the semantic layers below.
 */
const Palette = {
  /** The GameOn brand orange. */
  accent: '#F38F2F',
  /** The same brand orange used for emphasis and gradients. */
  accentVivid: '#F38F2F',
  /** Secondary accent, used for completed/archived states. */
  accentAlt: '#8B5CF6',
  accentAltSoft: 'rgba(139, 92, 246, 0.14)',
  /**
   * Accent tints are pure opacity over the dark ground, in four steps, so a
   * tinted surface is never a hand-mixed colour: `glass` for the faintest
   * wash, `soft` for filled tints, `light` for borders, `glow` for emphasis.
   */
  accentGlass: 'rgba(243, 143, 47, 0.08)',
  accentSoft: 'rgba(243, 143, 47, 0.12)',
  accentLight: 'rgba(243, 143, 47, 0.20)',
  accentGlow: 'rgba(243, 143, 47, 0.25)',
  /** Warm hairline for accent-tinted surfaces on the dark palette. */
  accentBorder: 'rgba(243, 143, 47, 0.28)',
  /**
   * What sits on top of the brand: white, as the mockups specify.
   *
   * White on the brand orange is below the 4.5:1 AA threshold for normal
   * button text. Ink provides a higher-contrast pairing. White is kept because
   * it is the design's intent; `ink` stays defined for anything that needs the
   * accessible pairing.
   */
  ink: '#0B0B0C',
  /** Pure white, for surfaces that must be white — a QR field, a dot over a photo. */
  white: '#FFFFFF',
  /** Translucent white, for highlights and inactive dots on dark surfaces. */
  highlight: 'rgba(255, 255, 255, 0.45)',
  highlightSoft: 'rgba(255, 255, 255, 0.28)',
  /** The faintest white wash, for raised rows on a dark surface. */
  highlightWash: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.35)',
  scrim: 'rgba(0, 0, 0, 0.62)',
  // dark surfaces
  darkBackground: '#0B0908',
  darkElement: '#16110C',
  darkSelected: '#201A13',
  darkBorder: '#2A241D',
  darkTextSecondary: '#A9A5A0',
  darkTextMuted: '#6E6A65',
  // light surfaces
  lightBackground: '#F7F4F0',
  lightElement: '#ECE6DF',
  lightSelected: '#E0D8CE',
  lightBorder: '#E3DCD3',
  lightText: '#17120E',
  lightTextSecondary: '#6E6560',
  lightTextMuted: '#9B948B',
  /** Reward and points visuals — the wallet coin and referral graphics. */
  gold: '#FFC53D',
  goldDeep: '#B45309',
  goldSoft: 'rgba(255, 197, 61, 0.16)',
  // feedback hues — shared across both schemes
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  info: '#3B82F6',
  infoSoft: 'rgba(59, 130, 246, 0.14)',
} as const;

/**
 * Semantic colors resolved per color scheme. Every screen reads from these so
 * the whole app shares one consistent GameOn palette (same accent + warm neutrals).
 */
export const Colors = {
  light: {
    text: Palette.lightText,
    background: Palette.lightBackground,
    backgroundElement: Palette.lightElement,
    backgroundSelected: Palette.lightSelected,
    textSecondary: Palette.lightTextSecondary,
    textMuted: Palette.lightTextMuted,
    accent: Palette.accent,
    accentVivid: Palette.accentVivid,
    accentGlass: Palette.accentGlass,
    accentSoft: Palette.accentSoft,
    accentLight: Palette.accentLight,
    accentGlow: Palette.accentGlow,
    accentBorder: Palette.accentBorder,
    accentAlt: Palette.accentAlt,
    accentAltSoft: Palette.accentAltSoft,
    gold: Palette.gold,
    goldDeep: Palette.goldDeep,
    goldSoft: Palette.goldSoft,
    onAccent: Palette.white,
    ink: Palette.ink,
    white: Palette.white,
    highlight: Palette.highlight,
    highlightSoft: Palette.highlightSoft,
    highlightWash: Palette.highlightWash,
    card: Palette.white,
    cardBorder: Palette.lightBorder,
    iconTile: Palette.accent,
    divider: Palette.lightBorder,
    overlay: Palette.overlay,
    scrim: Palette.scrim,
    success: Palette.success,
    successSoft: Palette.successSoft,
    warning: Palette.warning,
    warningSoft: Palette.warningSoft,
    danger: Palette.danger,
    dangerSoft: Palette.dangerSoft,
    info: Palette.info,
    infoSoft: Palette.infoSoft,
  },
  dark: {
    text: Palette.white,
    background: Palette.darkBackground,
    backgroundElement: Palette.darkElement,
    backgroundSelected: Palette.darkSelected,
    textSecondary: Palette.darkTextSecondary,
    textMuted: Palette.darkTextMuted,
    accent: Palette.accent,
    accentVivid: Palette.accentVivid,
    accentGlass: Palette.accentGlass,
    accentSoft: Palette.accentSoft,
    accentLight: Palette.accentLight,
    accentGlow: Palette.accentGlow,
    accentBorder: Palette.accentBorder,
    accentAlt: Palette.accentAlt,
    accentAltSoft: Palette.accentAltSoft,
    gold: Palette.gold,
    goldDeep: Palette.goldDeep,
    goldSoft: Palette.goldSoft,
    onAccent: Palette.white,
    ink: Palette.ink,
    white: Palette.white,
    highlight: Palette.highlight,
    highlightSoft: Palette.highlightSoft,
    highlightWash: Palette.highlightWash,
    card: Palette.darkElement,
    cardBorder: Palette.darkBorder,
    iconTile: Palette.accent,
    divider: Palette.darkBorder,
    overlay: Palette.overlay,
    scrim: Palette.scrim,
    success: Palette.success,
    successSoft: Palette.successSoft,
    warning: Palette.warning,
    warningSoft: Palette.warningSoft,
    danger: Palette.danger,
    dangerSoft: Palette.dangerSoft,
    info: Palette.info,
    infoSoft: Palette.infoSoft,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Third-party brand colours for the share targets on Refer & Earn. These are fixed
 * by the platforms themselves, which is exactly why they live here rather than
 * being retyped at each use.
 */
export const SocialColors = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  facebook: '#1877F2',
  more: Palette.darkSelected,
} as const;

/** The dark GameOn palette — what the app actually renders on every screen. */
export const Brand = Colors.dark;

/**
 * Per-sport identity colour, used for the round sport badge and the sport pill.
 * Matches the badge hues in the mockups (Screens 4–12).
 */
export const SportColors = {
  badminton: Palette.accent,
  pickleball: Palette.info,
  cricket: '#8B5CF6',
  football: Palette.success,
} as const;

export type SportKey = keyof typeof SportColors;

/** The tint an unknown or null sport key falls back to, so a badge always has a colour. */
export const DEFAULT_SPORT_COLOR: string = Palette.accent;

/** The fonts the web app already self-hosts through `next/font`. */
export const Fonts = {
  sans: 'var(--font-sans)',
  display: 'var(--font-display)',
  mono: 'var(--font-mono)',
} as const;

/**
 * The type scale. Spread these into a style object and add colour there —
 * `{ ...Typography.cardTitle, color: Brand.text }` — so size and weight stay
 * consistent while colour remains a per-use decision.
 */
export const Typography = {
  /** Hero copy on image-backed screens. */
  display: { fontSize: 30, fontWeight: 800, letterSpacing: -0.5 },
  /** The one big title at the top of a screen. */
  screenTitle: { fontSize: 26, fontWeight: 800, letterSpacing: -0.3 },
  /** Section headings within a screen. */
  sectionTitle: { fontSize: 19, fontWeight: 800 },
  /** Block/step headings inside a card. */
  blockTitle: { fontSize: 15, fontWeight: 800 },
  /** Card and list-row titles. */
  cardTitle: { fontSize: 16, fontWeight: 700 },
  /** Default running text. */
  body: { fontSize: 14, fontWeight: 400, lineHeight: '20px' },
  /** Emphasised running text and inline values. */
  bodyStrong: { fontSize: 14, fontWeight: 700 },
  /** Smaller supporting text. */
  bodySmall: { fontSize: 13, fontWeight: 400, lineHeight: '18px' },
  /** Field labels and meta rows. */
  label: { fontSize: 12, fontWeight: 600 },
  /** Timestamps, helper text, legends. */
  caption: { fontSize: 11, fontWeight: 500 },
  /** Uppercase eyebrows and badge text. */
  micro: { fontSize: 9, fontWeight: 800, letterSpacing: 0.4 },
  /** Button labels. */
  button: { fontSize: 15, fontWeight: 800, letterSpacing: 0.4 },
  /** Money — the ₹ figures on pricing, payment and summary rows. */
  price: { fontSize: 22, fontWeight: 800 },
  /** Money, inline within a row. */
  priceSmall: { fontSize: 15, fontWeight: 800 },
} as const satisfies Record<string, CSSProperties>;

export type TypographyVariant = keyof typeof Typography;

/**
 * Type for text inside a field. Size and weight only — deliberately no height
 * and no line height, so the field's own box decides the vertical rhythm and a
 * natural input height is never clipped.
 */
export const InputText = {
  lg: { fontSize: 17, fontWeight: 600, padding: 0 },
  md: { fontSize: 15, fontWeight: 600, padding: 0 },
  sm: { fontSize: 13, fontWeight: 600, padding: 0 },
} as const satisfies Record<string, CSSProperties>;

/** Line height for multi-line field entry, where a line height is wanted. */
export const INPUT_MULTILINE_LINE_HEIGHT = '20px';

/**
 * The spacing scale. Prefer the named keys (`xs`…`xxl`) in new code; the
 * positional keys below them are the original names, kept as aliases so the
 * screens written before this scale existed keep compiling.
 */
export const Spacing = {
  xxs: 2,
  xs: 3,
  sm: 6,
  md: 13,
  lg: 19,
  xl: 25,
  xxl: 50,
  /** @deprecated use `xxs` */
  half: 2,
  /** @deprecated use `xs` */
  one: 3,
  /** @deprecated use `sm` */
  two: 6,
  /** @deprecated use `md` */
  three: 13,
  /** @deprecated use `lg` */
  four: 19,
  /** @deprecated use `xl` */
  five: 25,
  /** @deprecated use `xxl` */
  six: 50,
} as const;

/** Corner radii. `pill` is the fully-rounded end cap used by chips and badges. */
export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

/**
 * Elevation presets, as CSS box-shadows. `accent` is the orange glow under a
 * primary CTA; `card` is the quiet lift under a surface; `floating` is for
 * sticky footers and sheets that sit above scrolling content.
 */
export const Shadows = {
  card: { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.28)' },
  accent: { boxShadow: '0 7px 14px rgba(243, 143, 47, 0.35)' },
  floating: { boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.45)' },
} as const satisfies Record<string, CSSProperties>;

/** Fixed structural measurements shared by the shell components. */
export const Layout = {
  /** Height of the app header content row. */
  headerHeight: 44,
  /** Height of the bottom tab bar, excluding the safe-area inset. */
  tabBarHeight: 58,
  /** Height of a sticky CTA footer, excluding the safe-area inset. */
  footerHeight: 74,
  /** Minimum touch target, per the platform accessibility guidelines. */
  minHitTarget: 44,
  /** Standard horizontal gutter for screen content. */
  gutter: Spacing.md,
  /** Icon-button diameter used in headers and toolbars. */
  iconButton: 34,
} as const;

/**
 * The widest the phone shell is allowed to grow. A desktop browser renders the
 * app as a centred handset rather than stretching a 390pt layout across 1920px.
 */
export const MaxContentWidth = 800;

/** The width of the handset frame the `/app` route renders inside. */
export const PhoneFrameWidth = 430;
