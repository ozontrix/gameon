'use client';

/**
 * A modal sheet anchored to the bottom of the screen — filter panels, pickers,
 * confirmations. The web twin of the app `components/ui/bottom-sheet.tsx`.
 *
 * The scrim and the panel are animated separately on purpose: the scrim **fades
 * in place** while the panel **rises**. Animating them together drags the tint
 * up from the bottom edge and reads as cheap. Both are driven from one `open`
 * flag here, so they stay in step, and the sheet stays mounted until the closing
 * animation finishes so dismissing is as considered as opening.
 *
 * It is portalled into the handset frame rather than the document body, so on a
 * desktop browser the sheet belongs to the phone column instead of sliding up
 * from the bottom of the window.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Duration } from '@/lib/mobile/constants/motion';
import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from './icons';
import { PressableScale } from './motion';

/** The element the app layout renders for sheets to portal into. */
export const SHEET_ROOT_ID = 'gameon-sheet-root';

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Muted line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Pinned actions at the foot of the sheet. */
  footer?: ReactNode;
}) {
  // Read during render rather than in an effect: the layout is server-rendered,
  // so the element is already in the HTML by the time this mounts. Nothing is
  // rendered until `rendered` is true, so the hydration output still matches.
  const root = typeof document === 'undefined' ? null : document.getElementById(SHEET_ROOT_ID);
  const [rendered, setRendered] = useState(visible);
  const [open, setOpen] = useState(false);

  // Adjusting state from props during render — keeps the sheet mounted for the
  // closing animation without an extra effect pass.
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    // Both state changes are deferred into callbacks: a synchronous setState in
    // an effect body is a cascading render, and the open flag only has to flip
    // after the browser has painted the sheet's starting position anyway.
    const frame = requestAnimationFrame(() => setOpen(visible));
    const timer = visible ? null : setTimeout(() => setRendered(false), Duration.base);
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  // Escape closes, which is what a keyboard user will reach for.
  useEffect(() => {
    if (!rendered) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rendered, onClose]);

  if (!rendered || !root) return null;

  const panel: CSSProperties = {
    backgroundColor: Brand.backgroundElement,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTop: `1px solid ${Brand.cardBorder}`,
    paddingLeft: Layout.gutter,
    paddingRight: Layout.gutter,
    paddingTop: Spacing.md,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${Spacing.lg}px)`,
    display: 'flex',
    flexDirection: 'column',
    gap: Spacing.md,
    maxHeight: 'calc(100% - 50px)',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: `transform ${open ? Duration.slow : Duration.base}ms cubic-bezier(0.215, 0.61, 0.355, 1)`,
  };

  return createPortal(
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}>
      <div
        role="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: Brand.scrim,
          opacity: open ? 1 : 0,
          transition: `opacity ${Duration.base}ms ease`,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', ...panel }}>
        <span
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: Radius.pill,
            backgroundColor: Brand.cardBorder,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.md }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
            <span style={{ ...Typography.blockTitle, color: Brand.text }}>{title}</span>
            {subtitle ? (
              <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>{subtitle}</span>
            ) : null}
          </div>

          <PressableScale
            onPress={onClose}
            label="Close"
            style={{
              width: Layout.iconButton,
              height: Layout.iconButton,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: Radius.pill,
              border: 'none',
              backgroundColor: Brand.backgroundSelected,
              cursor: 'pointer',
            }}>
            <Ion name="close" size={18} color={Brand.textSecondary} />
          </PressableScale>
        </div>

        {/* Shrinks first, so the header and footer keep their space. */}
        <div
          className="mobile-scroll"
          style={{
            flexShrink: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.md,
            paddingBottom: Spacing.xs,
          }}>
          {children}
        </div>

        {footer ? (
          <div style={{ display: 'flex', gap: Spacing.sm, paddingTop: Spacing.xs }}>{footer}</div>
        ) : null}
      </div>
    </div>,
    root,
  );
}
