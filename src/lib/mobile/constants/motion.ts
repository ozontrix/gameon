/**
 * The app's motion vocabulary — the web twin of
 * `gameon-multisports/src/constants/motion.ts`.
 *
 * Every animation reads its timing from here, so the whole app moves at the
 * same speed and with the same character. Rule of thumb: the smaller the
 * element, the faster it moves. A chip settles in `fast`, a panel in `base`, a
 * sheet in `slow`.
 *
 * The Expo file exposes Reanimated easing objects and springs. A browser has
 * neither, so the same curves are expressed as CSS `cubic-bezier` strings and
 * the springs as their closest timed equivalent — the durations, travel
 * distances and press feel are unchanged.
 */

export const Duration = {
  /** Press feedback. Below ~120ms reads as instant. */
  instant: 120,
  /** Chips, toggles, small state changes. */
  fast: 180,
  /** The default for content entering or leaving. */
  base: 240,
  /** Sheets, panels, anything covering a large area. */
  slow: 320,
  /** Celebration moments — the booking-confirmed mark. */
  deliberate: 460,
  /**
   * One pass of a loading shimmer. Fast enough to read as activity, slow
   * enough not to strobe while a screen of cards is waiting.
   */
  shimmer: 1150,
  /**
   * Continuous decorative motion: a glow breathing, artwork drifting. Slow
   * enough to register as atmosphere rather than as something demanding a
   * response.
   */
  ambient: 2400,
} as const;

/**
 * Easing curves. `standard` for most things, `decelerate` for elements entering
 * the screen, `accelerate` for elements leaving it.
 */
export const Curve = {
  /** Symmetric ease — movement within the screen. */
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Fast out, slow in — entering content settles gently. */
  decelerate: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  /** Slow out, fast in — leaving content gets out of the way. */
  accelerate: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  /** Linear, for continuous motion such as a marquee. */
  linear: 'linear',
} as const;

/** How far content travels when it fades up into place. */
export const Travel = {
  /** List rows, chips. */
  sm: 8,
  /** Cards and sections. */
  md: 16,
  /** Sheets and full panels. */
  lg: 28,
} as const;

/** Gap between siblings in a staggered entrance. */
export const STAGGER_STEP = 55;

/** Ceiling on stagger delay, so long lists don't crawl in. */
const STAGGER_MAX = 6;

/** Delay for the nth item of a staggered group. */
export function stagger(index: number, step: number = STAGGER_STEP): number {
  return Math.min(index, STAGGER_MAX) * step;
}

/** Scale a pressable settles to while held. */
export const PRESS_SCALE = 0.97;

/** Opacity a pressable settles to while held. */
export const PRESS_OPACITY = 0.85;

/** How long each hero slide holds before advancing. */
export const HERO_AUTOPLAY_MS = 4500;
