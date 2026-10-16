'use client';

/**
 * The sliding court-photo gallery on the Sport Detail screen: a paging strip with
 * a "1 / 6" counter, under it a thumbnail rail that jumps the main frame. The web
 * twin of the app `components/sports/photo-gallery.tsx`.
 *
 * The frame is a scroll-snap track rather than a transform-driven carousel, so the
 * browser gives it the same native paging feel, keyboard support and
 * rubber-banding the handset gets from `pagingEnabled`.
 */

import { useRef, useState } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { RemoteImage } from '../ui';

/** Thumbnails shown before the remainder collapses into a "+N" tile. */
const VISIBLE_THUMBS = 4;

export function PhotoGallery({ images, label }: { images: string[]; label: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement | null>(null);

  if (images.length === 0) return null;

  // One photo has nothing to page through: no counter, no thumbnail rail.
  const paged = images.length > 1;

  const goTo = (next: number) => {
    setIndex(next);
    const element = track.current;
    element?.scrollTo({ left: next * (element.clientWidth || 1), behavior: 'smooth' });
  };

  const thumbs = images.slice(0, VISIBLE_THUMBS);
  const overflow = images.length - VISIBLE_THUMBS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
      <div
        style={{
          position: 'relative',
          // 0.62 keeps the handset's frame proportion while the width varies.
          aspectRatio: '1 / 0.62',
          borderRadius: Radius.lg,
          overflow: 'hidden',
          backgroundColor: Brand.backgroundElement,
        }}>
        <div
          ref={track}
          className="mobile-scroll"
          onScroll={(event) => {
            const element = event.currentTarget;
            setIndex(Math.round(element.scrollLeft / (element.clientWidth || 1)));
          }}
          style={{
            display: 'flex',
            height: '100%',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
          }}>
          {images.map((uri, position) => (
            <div key={`${uri}-${position}`} style={{ flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start' }}>
              <RemoteImage
                uri={uri}
                style={{ width: '100%', height: '100%' }}
                accessibilityLabel={`${label} photo ${position + 1} of ${images.length}`}
              />
            </div>
          ))}
        </div>

        {paged ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: Spacing.sm,
              bottom: Spacing.sm,
              borderRadius: Radius.xs,
              paddingLeft: Spacing.sm,
              paddingRight: Spacing.sm,
              paddingTop: Spacing.xxs,
              paddingBottom: Spacing.xxs,
              backgroundColor: Brand.scrim,
              ...Typography.caption,
              color: Brand.text,
            }}>
            {index + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {paged ? (
        <div style={{ display: 'flex', gap: Spacing.sm }}>
          {thumbs.map((uri, position) => (
            <button
              key={`thumb-${uri}-${position}`}
              type="button"
              aria-label={`Show photo ${position + 1}`}
              aria-current={index === position}
              onClick={() => goTo(position)}
              className="mobile-press"
              style={{
                width: 72,
                aspectRatio: '1.35',
                borderRadius: Radius.sm,
                border: `${index === position ? 2 : 1}px solid ${
                  index === position ? Brand.accent : Brand.cardBorder
                }`,
                overflow: 'hidden',
                padding: 0,
                background: 'none',
                cursor: 'pointer',
              }}>
              <RemoteImage uri={uri} style={{ width: '100%', height: '100%' }} />
            </button>
          ))}

          {overflow > 0 ? (
            <button
              type="button"
              aria-label={`Show the remaining ${overflow} photos`}
              onClick={() => goTo(VISIBLE_THUMBS)}
              className="mobile-press"
              style={{
                width: 72,
                aspectRatio: '1.35',
                borderRadius: Radius.sm,
                border: `${index >= VISIBLE_THUMBS ? 2 : 1}px solid ${
                  index >= VISIBLE_THUMBS ? Brand.accent : Brand.cardBorder
                }`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Brand.backgroundSelected,
                cursor: 'pointer',
                ...Typography.label,
                color: Brand.text,
              }}>
              +{overflow}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
