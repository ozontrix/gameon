'use client';

/**
 * The app's motion primitives — the web twin of
 * `gameon-multisports/src/components/ui/motion.tsx`.
 *
 * On a handset these are Reanimated entrance animations and a spring-driven
 * Pressable. A browser has neither, so the same timings and travel distances
 * from `constants/motion.ts` are expressed as CSS animations, and the press
 * spring becomes a `:active` transform. The one deliberate difference is that
 * `PressableScale` renders a real `<button>` (or a div, for a card that holds
 * other controls), because on the web the element itself is what carries the
 * semantics and the keyboard behaviour.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Duration, PRESS_OPACITY, PRESS_SCALE, Travel, stagger } from '@/lib/mobile/constants/motion';

type MotionProps = {
  children: ReactNode;
  /** Position within a staggered group; drives the delay. */
  index?: number;
  /** Explicit delay in ms, overriding `index`. */
  delay?: number;
  style?: CSSProperties;
};

function delayFor({ index, delay }: Pick<MotionProps, 'index' | 'delay'>): number {
  if (delay !== undefined) return delay;
  return index === undefined ? 0 : stagger(index);
}

/** A class that carries the shared entrance animation, so the timing lives in CSS. */
const ENTER_CLASS = 'mobile-enter';

/**
 * The house entrance: content fades while rising a short distance. Use for
 * cards, sections and list rows. Pass `index` to stagger siblings.
 */
export function FadeUp({ children, index, delay, style }: MotionProps) {
  return (
    <div
      className={ENTER_CLASS}
      style={{
        // The travel and the duration come from the shared vocabulary; the
        // keyframes themselves are in mobile.css, since CSS cannot read these.
        animationDuration: `${Duration.base}ms`,
        animationDelay: `${delayFor({ index, delay })}ms`,
        ['--mobile-travel' as string]: `${Travel.md}px`,
        ...style,
      }}>
      {children}
    </div>
  );
}

/** A plain cross-fade, for content that should not appear to move. */
export function FadeIn({ children, index, delay, style }: MotionProps) {
  return (
    <div
      className="mobile-fade"
      style={{
        animationDuration: `${Duration.base}ms`,
        animationDelay: `${delayFor({ index, delay })}ms`,
        ...style,
      }}>
      {children}
    </div>
  );
}

/** A spring-scaled arrival, for badges and confirmation marks. */
export function Pop({ children, index, delay, style }: MotionProps) {
  return (
    <div
      className="mobile-pop"
      style={{
        animationDuration: `${Duration.deliberate}ms`,
        animationDelay: `${delayFor({ index, delay })}ms`,
        ...style,
      }}>
      {children}
    </div>
  );
}

type PressableScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  /** Turn off the scale and keep only the opacity dip. */
  scale?: boolean;
  /** Announced by a screen reader; an icon-only control must pass one. */
  label?: string;
  /**
   * `div` for a surface that contains its own controls — a `<button>` may not
   * contain another interactive element.
   */
  as?: 'button' | 'div';
  type?: 'button' | 'submit';
  className?: string;
};

/**
 * A surface that dips under the finger. The tactile detail that separates a
 * premium build from a functional one — used for cards and tiles where the
 * whole surface is the target.
 *
 * The press feedback is CSS (`:active`), not React state: a state-driven scale
 * re-renders the whole subtree on every touch, and on a list of cards that is
 * the difference between a responsive tap and a visible stutter.
 */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  scale = true,
  label,
  as = 'button',
  type = 'button',
  className,
}: PressableScaleProps) {
  const shared = {
    onClick: disabled ? undefined : onPress,
    className: `mobile-press${scale ? '' : ' mobile-press-noscale'}${className ? ` ${className}` : ''}`,
    'aria-label': label,
    'aria-disabled': disabled || undefined,
    style: {
      ['--mobile-press-scale' as string]: String(PRESS_SCALE),
      ['--mobile-press-opacity' as string]: String(PRESS_OPACITY),
      ...style,
    } as CSSProperties,
  };

  if (as === 'div') {
    return (
      <div role="button" tabIndex={disabled ? undefined : 0} {...shared}>
        {children}
      </div>
    );
  }

  return (
    <button type={type} disabled={disabled} {...shared}>
      {children}
    </button>
  );
}
